(invoke, options = {}) => {
  const boundaries = new Map();
  const pendingScreenshots = new Map();
  const observations = new Map();
  const baselines = new Map();
  const closed = new Set();
  let sequence = 0;
  const clone = value => JSON.parse(JSON.stringify(value));
  const docs = () => ({version:'cotree-browser-sdk-v1', tools:options.tools || [], instructions:options.documentation || ''});
  const view = (key, page, settings = {}) => {
    if (!options.deltas) return page;
    const previous = baselines.get(key);
    const baselineId = (options.epoch || 'program') + ':' + (++sequence);
    const scope = JSON.stringify([settings.query || '',settings.queryMode || 'any',[...(settings.roles || [])].sort(),settings.frameId || '',Boolean(settings.interactive)]);
    const full = {...page, observationMode:'full', baselineId, observationScope:scope};
    const compatible = previous && settings.since === previous.baselineId && page.refsComplete === true && previous.refsComplete === true
      && !page.textTruncated && !previous.textTruncated && page.document?.generation !== undefined
      && page.document.generation === previous.document?.generation && page.url === previous.url
      && page.sessionId === previous.sessionId && page.tabId === previous.tabId
      && scope === previous.observationScope
      && !page.query && !previous.query && page.refOffset === 0 && previous.refOffset === 0;
    if (baselines.size >= 32 && !baselines.has(key)) baselines.delete(baselines.keys().next().value);
    baselines.set(key, clone(full));
    if (!compatible) return full;
    const before = new Map(previous.refs.map(ref => [ref.ref, ref]));
    const after = new Map(page.refs.map(ref => [ref.ref, ref]));
    const added = page.refs.filter(ref => !before.has(ref.ref));
    const changed = page.refs.filter(ref => before.has(ref.ref) && JSON.stringify(before.get(ref.ref)) !== JSON.stringify(ref));
    const removed = previous.refs.filter(ref => !after.has(ref.ref)).map(ref => ref.ref);
    const delta = {observationMode:'delta',baselineId,baseBaselineId:previous.baselineId,sessionId:page.sessionId,tabId:page.tabId,url:page.url,
      title:page.title,document:page.document,added,changed,removed,refsComplete:true,refCount:page.refCount,
      ...(page.text === previous.text ? {} : {text:page.text})};
    return JSON.stringify(delta).length < JSON.stringify(full).length ? delta : full;
  };
  const aliases = (value, entries) => {
    if (value && typeof value === 'object') for (const [name, alias] of Object.entries(entries)) {
      if (!(name in value)) Object.defineProperty(value, name, {value:alias, enumerable:false, configurable:true});
    }
    return value;
  };
  const pageView = page => aliases(page, {output:page});
  const stateView = state => aliases(state, {state, output:state});
  const call = async (name, input) => {
    if (options.tools && !options.tools.includes(name)) {
      const error = new Error(name + ' is not prepared in this request. Read browser.documentation() or use ToolSearch.');
      error.code = 'BROWSER_SDK_CAPABILITY_UNAVAILABLE'; throw error;
    }
    const result = await invoke(name, input);
    if (!result.ok || result.budget?.complete === false || result.output?.remainingActions > 0) {
      const error = new Error(result.error?.message || 'Browser operation incomplete; inspect receipt before continuing.');
      error.code = result.error?.code || 'BROWSER_OPERATION_INCOMPLETE'; error.output = result.output; error.receipt = result; throw error;
    }
    return result.output;
  };
  const tab = (tabId, sessionId) => {
    const target = { ...(tabId ? {tabId} : {}), ...(sessionId ? {sessionId} : {}) };
    const locatorTargets = new WeakMap();
    const observedTarget = value => {
      const nonempty = text => typeof text === 'string' && text.trim().length > 0;
      if (nonempty(value)) return {ref:value};
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const handle = locatorTargets.get(value);
        if (handle) return handle;
        const locator = value.locator || value;
        if (nonempty(value.ref) || ['role','name','label','hasText'].some(key=>nonempty(locator[key]))) {
          // Keep the complete object so unknown fields and invalid combinations
          // remain visible to the authoritative host schema validator.
          return 'ref' in value || 'locator' in value ? value : {locator:value};
        }
      }
      const error = new Error('An observed target is required. Use tab.click(ref,{expect:[condition]}) or tab.getByRole(role,{name}).click({expect:[condition]}).');
      error.code = 'BROWSER_TARGET_REQUIRED'; throw error;
    };
    const key = JSON.stringify([sessionId || '', tabId || '']);
    const checkOpen = () => { if (closed.has(key)) throw new Error('BROWSER_TAB_CLOSED: Bind a live tab again.'); };
    const unresolvedReceipt = receipt => Boolean(receipt && (receipt.boundary || receipt.execution === 'unknown'
      || receipt.execution === 'completed' && receipt.effect === 'unknown'
      || receipt.outcome === 'unknown' || receipt.verification?.status === 'unknown'
      || receipt.uncertain === true));
    const unresolvedOutput = output => unresolvedReceipt(output)
      || Array.isArray(output?.results) && output.results.some(unresolvedReceipt);
    const retainPage = output => {
      const page = output?.postObservations?.pageAfterAction;
      if (page?.ok && page.output) {
        const pageKey = JSON.stringify([page.output.sessionId || sessionId || '', page.output.tabId || tabId || '']);
        observations.set(pageKey, pageView(clone(page.output)));
      }
    };
    const act = async (action, fields = {}) => {
      checkOpen();
      const boundary = boundaries.get(key);
      if (boundary && !['inspect','find','wait','dialog'].includes(action)) {
        const error = new Error('Observe the previous action before another write; completed input was not replayed.');
        error.code = 'BROWSER_DECISION_BOUNDARY'; error.receipt = boundary; throw error;
      }
      const input = {...fields, ...target, action};
      if (!['inspect','find','wait'].includes(action)) pendingScreenshots.delete(key);
      if (!['inspect','find','wait'].includes(action)) observations.delete(key);
      // Empty optional predicate arrays in JavaScript mean no extra assertion.
      // Keep nonempty predicates and requireTransition strict in the dispatcher.
      for (const key of ['expect','preconditions','goalConditions']) {
        if (Array.isArray(input[key]) && input[key].length === 0) delete input[key];
      }
      let output;
      try { output = await call('BrowserAct', input); }
      catch (error) {
        const failed = error.receipt?.output || error.output;
        retainPage(failed);
        if (unresolvedOutput(failed) || unresolvedOutput(error.receipt)) boundaries.set(key, failed || error.receipt);
        throw error;
      }
      const receipt = output.results?.at(-1) || output;
      retainPage(output);
      // Reading or waiting does not prove an earlier mutation completed. Only
      // an explicit new page observation releases this program decision barrier.
      if (!['inspect','find','wait'].includes(action)) {
        if (unresolvedOutput(output)) boundaries.set(key, output);
        else if (!boundary) boundaries.delete(key);
      }
      return aliases({...receipt, ...(output.operationId ? {operationId:output.operationId} : {}), ...(output.postObservations?.pageAfterAction?.output ? {pageAfterAction:pageView(output.postObservations.pageAfterAction.output)} : {})}, {output});
    };
    const targetLocator = target => {
      const inspect = async () => stateView((await act('inspect', target)).state);
      const handle = Object.freeze({
        ...(target.ref ? {ref:target.ref} : {}),
        ...(target.locator ? {
          getByRole:(role,settings={})=>locator({role,exact:true,...settings,frameId:settings.frameId || target.locator.frameId,within:target.locator}),
          getByLabel:(label,settings={})=>locator({label,...settings,frameId:settings.frameId || target.locator.frameId,within:target.locator}),
          filter:settings=>locator({...target.locator,...settings}),
          nth:index=>locator({...target.locator,nth:index})
        } : {}),
        click: (options = {}) => act('click', {...target, ...options}),
        hover: (options = {}) => act('hover', {...target, ...options}),
        fill: (text, options = {}) => act('fill', {...target, value:String(text), ...options}),
        upload: (files, options = {}) => act('upload', {...target, files:Array.isArray(files) ? files : [files], ...options}),
        scroll: (options = {}) => act('scroll', {...target,...options}),
        waitFor: (options = {}) => wait({expect:[{kind:'element',...target,state:options.state || 'visible'}],timeoutMs:options.timeoutMs}),
        press: (key, options = {}) => act('press', {...target, key, ...options}),
        selectOption: (option) => act('select', {...target, ...(typeof option === 'string' ? {value:option} : option)}),
        setChecked: (checked) => act('check', {...target, checked}),
        setRange: (number) => act('setRange', {...target, value:String(number)}),
        inspect,
        isEnabled: async () => (await inspect()).enabled === true,
        isChecked: async () => (await inspect()).checked === true,
        inputValue: async () => (await inspect()).value,
        textContent: async () => (await inspect()).text
      });
      locatorTargets.set(handle, target);
      return handle;
    };
    const locator = (value) => {
      // A ref is an observed element identity, not a schema-valid locator.
      // Fail early with an actionable hint instead of sending an invalid
      // {locator:{ref}} payload to the host.
      if (typeof value === 'string' || value && typeof value === 'object' && 'ref' in value) {
        const error = new Error('locator() accepts role/name locators. Use tab.byRef(ref) for an observed ref.');
        error.code = 'BROWSER_REF_LOCATOR_INVALID'; throw error;
      }
      return targetLocator({locator:value});
    };
    const byRef = ref => {
      if (typeof ref !== 'string' || !ref.trim()) {
        const error = new Error('byRef requires a non-empty observed ref from a fresh observe() result.');
        error.code = 'BROWSER_REF_REQUIRED'; throw error;
      }
      return targetLocator({ref});
    };
    const batch = async (actions, options = {}) => {
      checkOpen();
      if (!Array.isArray(actions) || actions.length === 0) {
        const error = new Error('tab.batch requires a non-empty action array.');
        error.code = 'BROWSER_BATCH_REQUIRED'; throw error;
      }
      const boundary = boundaries.get(key);
      if (boundary) {
        const error = new Error('Observe the previous action before another write; completed input was not replayed.');
        error.code = 'BROWSER_DECISION_BOUNDARY'; error.receipt = boundary; throw error;
      }
      const normalize = value => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
        const copy = {...value};
        for (const name of ['expect','preconditions','goalConditions']) {
          if (Array.isArray(copy[name]) && copy[name].length === 0) delete copy[name];
        }
        return copy;
      };
      const input = {...normalize(options), ...target, actions:actions.map(normalize)};
      observations.delete(key);
      let output;
      try {
        output = await call('BrowserAct', input);
        const results = output?.results;
        const failed = Array.isArray(results) && results.find(result => result && (result.ok === false || result.execution === 'unknown'
          || ['unknown','no_change','unsatisfied','cancelled','failed'].includes(result.outcome)
          || ['unknown','unsatisfied'].includes(result.verification?.status)));
        const incomplete = !Array.isArray(results) || results.length !== actions.length
          || results.some(result => !result || typeof result !== 'object' || Array.isArray(result))
          || output.requestedActions !== undefined && output.requestedActions !== actions.length
          || output.completedActions !== undefined && output.completedActions !== actions.length
          || ['stopped','interrupted','cancelled','failed'].includes(output.status);
        const crossedBoundary = Array.isArray(results) && results.slice(0,-1).some(unresolvedReceipt);
        if (failed || incomplete || crossedBoundary) {
          const error = new Error('Browser batch did not complete safely; inspect its receipt and continue only undispatched actions.');
          error.code = failed?.code || 'BROWSER_OPERATION_INCOMPLETE'; error.output = output;
          error.receipt = {ok:false,output,error:{code:error.code,message:error.message}};
          throw error;
        }
      }
      catch (error) {
        const failed = error.receipt?.output || error.output;
        retainPage(failed);
        if (unresolvedOutput(failed) || unresolvedOutput(error.receipt) || error.code === 'BROWSER_OPERATION_INCOMPLETE'
          || !Array.isArray(failed?.results) && failed?.execution !== 'not_started' && !['BROWSER_SDK_CAPABILITY_UNAVAILABLE','TOOL_INPUT_INVALID'].includes(error.code)) {
          boundaries.set(key, failed || error.receipt || {execution:'unknown',reason:'receipt_missing',nextAction:'Inspect the original receipt and target before continuing.',error:String(error.message || error)});
        }
        throw error;
      }
      const receipt = output.results?.at(-1) || output;
      retainPage(output);
      if (unresolvedOutput(output)) boundaries.set(key, output); else boundaries.delete(key);
      return aliases({...output, lastResult:receipt,
        ...(output.postObservations?.pageAfterAction?.output ? {pageAfterAction:pageView(output.postObservations.pageAfterAction.output)} : {})}, {output});
    };
    const verify = async (goalConditions, options = {}) => {
      if (!Array.isArray(goalConditions) || goalConditions.length === 0 || goalConditions.length > 16) {
        const error = new Error('verify requires 1-16 task-grounded conditions. A successful input receipt is not final acceptance.');
        error.code = 'BROWSER_GOAL_CONDITIONS_REQUIRED'; throw error;
      }
      // The host checks these conditions against current page state, independent
      // of script-maintained counters. A read-only wait can reconcile a pending
      // write without replaying it; the existing observation barrier stays put.
      const receipt = await act('wait', {goal:options.goal, timeoutMs:options.timeoutMs, ms:0, goalConditions});
      const output = receipt.output;
      if (output?.taskVerified !== true || output.goalVerification?.status !== 'satisfied') {
        const error = new Error('The host did not verify the objective conditions. Observe current state before continuing.');
        error.code = 'BROWSER_GOAL_UNSATISFIED'; error.output = output;
        error.receipt = {ok:false,output}; throw error;
      }
      return output;
    };
    const fillCell = (refOrLocator, text, options = {}) => {
      const {commitKey = 'Enter', fillOptions = {}, commitOptions = {}, ...batchOptions} = options || {};
      if (commitKey !== null && commitKey !== false && (typeof commitKey !== 'string' || !commitKey.trim())) {
        const error = new Error('fillCell commitKey must be a key string or null to omit the commit.');
        error.code = 'BROWSER_CELL_COMMIT_INVALID'; throw error;
      }
      const target = observedTarget(refOrLocator);
      const actions = [{...fillOptions, kind:'fill', ...target, value:String(text)}];
      if (commitKey !== null && commitKey !== false) actions.push({...commitOptions, kind:'press', ...target, key:commitKey});
      return batch(actions, batchOptions);
    };
    const wait = settings => {
      const fields = typeof settings === 'number' ? {ms:settings} : settings;
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)
        || fields.ms !== undefined && (!Number.isInteger(fields.ms) || fields.ms < 0)
        || fields.ms === undefined && (!Array.isArray(fields.expect) || fields.expect.length === 0)) {
        const error = new Error('Use tab.wait(ms) or tab.wait({ms}) with a non-negative integer, or tab.wait({expect:[condition],timeoutMs:3000}). timeoutMs bounds condition checking; it is not a wait duration.');
        error.code = 'BROWSER_WAIT_ARGUMENT_INVALID'; throw error;
      }
      return act('wait', fields);
    };
    const events = async () => {
      const items=await tabs(sessionId), item=items.find(item=>item.tabId===tabId);
      if(!item) throw new Error('BROWSER_TAB_CLOSED: Observe the remaining tabs.');
      if(!Array.isArray(item.events)) throw Object.assign(new Error('This backend does not expose browser events.'),{code:'BROWSER_EVENTS_UNAVAILABLE'});
      return {cursor:item.eventCursor || 0,events:item.events.map(event=>({...event,sessionId:event.sessionId || sessionId,tabId:event.tabId || tabId})),dialog:item.dialog,
        nativeFileChooserEvents:item.nativeFileChooserEvents || 'capability_not_reported'};
    };
    const waitForEvent = async (kind, settings={}) => {
      if(!['popup','dialog','fileChooser','download','navigation'].includes(kind) || !Number.isInteger(settings.after) || settings.after<0)
        throw new Error('Use a supported event kind and after:cursor captured before the triggering action.');
      const deadline=Date.now()+Math.min(20000,Math.max(0,settings.timeoutMs ?? 5000));
      do {
        const state=await events();
        if(kind==='fileChooser' && state.nativeFileChooserEvents==='unsupported') throw Object.assign(new Error('This backend cannot observe native file chooser transitions. Enumerate actual desktop windows explicitly; do not replay the triggering input.'),{code:'BROWSER_NATIVE_DIALOG_UNAVAILABLE'});
        if(state.events.length && settings.after<state.events[0].sequence-1) throw Object.assign(new Error('Event cursor expired; inspect current state.'),{code:'BROWSER_EVENT_CURSOR_STALE'});
        const event=state.events.find(e=>e.sequence>settings.after && e.kind===kind && (!settings.state || e.state===settings.state)
          && (!settings.operationId || e.operationId===settings.operationId) && (!settings.downloadId || e.downloadId===settings.downloadId));
        if(event) return event;
        if(Date.now()>=deadline) break;
        // The host owns cancelable sleep; there is no parallel browser input.
        if(typeof sleep==='function') await sleep(Math.min(100,Math.max(1,deadline-Date.now())));
        else await wait(Math.min(100,Math.max(1,deadline-Date.now())));
      } while(Date.now()<=deadline);
      throw Object.assign(new Error('No matching browser event before deadline; input was not replayed.'),{code:'BROWSER_EVENT_TIMEOUT'});
    };
    const scrollUntil = async (container, wanted, settings={}) => {
      const target=observedTarget(wanted), maxSteps=Math.min(40,Math.max(1,settings.maxSteps ?? 12));
      const deadline=Date.now()+Math.min(20000,Math.max(0,settings.timeoutMs ?? 10000));
      for(let step=0;step<=maxSteps && Date.now()<deadline;step++) {
        try { return {state:stateView((await act('inspect',{...target,timeoutMs:0})).state),steps:step}; }
        catch(error) { if(error.code!=='BROWSER_LOCATOR_NOT_FOUND') throw error; }
        if(step===maxSteps) break;
        const result=await act('scroll',{...observedTarget(container),deltaY:settings.deltaY ?? 400,timeoutMs:Math.max(1,deadline-Date.now())});
        if(result.scroll?.atBoundary) break;
      }
      throw Object.assign(new Error('Target not found within the bounded scroll search.'),{code:'BROWSER_SCROLL_SEARCH_EXHAUSTED'});
    };
    return Object.freeze({
      tabId, sessionId,
      diagnostics: (operation, settings = {}) => {
        checkOpen();
        return call('BrowserDiagnostics', {...settings, ...target, operation});
      },
      getByRole: (role, options = {}) => locator({role, exact:true, ...options}),
      getByLabel: (label, options = {}) => locator({label, ...options}),
      locator,
      byRef,
      batch,
      verify,
      fillCell,
      click: (refOrLocator, options = {}) => act('click', {...observedTarget(refOrLocator), ...options}),
      clickAt: (x, y, options = {}) => {
        if (!options || typeof options.observationId !== 'string' || !options.observationId) {
          const error = new Error('clickAt requires observationId from a fresh viewport screenshot.');
          error.code = 'BROWSER_COORDINATE_OBSERVATION_REQUIRED'; throw error;
        }
        return act('clickCoords', {...options, x, y});
      },
      doubleClickAt: (x, y, options = {}) => {
        if (!options || typeof options.observationId !== 'string' || !options.observationId) {
          const error = new Error('doubleClickAt requires observationId from a fresh viewport screenshot.');
          error.code = 'BROWSER_COORDINATE_OBSERVATION_REQUIRED'; throw error;
        }
        return act('clickCoords', {...options, x, y, clickCount:2});
      },
      hover: (refOrLocator, options = {}) => act('hover', {...observedTarget(refOrLocator), ...options}),
      inspect: async (refOrLocator) => stateView((await act('inspect', observedTarget(refOrLocator))).state),
      press: (key, options = {}) => act('press', {key, ...options}),
      observe: async (settings = {}) => {
        checkOpen();
        const {since, ...snapshotSettings} = settings;
        const page = pageView(await call('BrowserSnapshot', {...snapshotSettings, ...target, backend:'session'}));
        observations.delete(key); boundaries.delete(key); return pageView(view(key, page, settings));
      },
      attachedObservation: () => { checkOpen(); const page=observations.get(key); return page ? clone({...page,observationMode:'attached',freshness:'not_rechecked'}) : null; },
      find: (text) => act('find', {text}),
      wait,
      back: (options = {}) => act('back', options),
      forward: (options = {}) => act('forward', options),
      reload: (options = {}) => act('reload', options),
      scroll: (options = {}) => act('scroll', options),
      scrollUntil,
      insertText: (text,options={}) => act('typeText',{text:String(text),...options}),
      upload: (refOrLocator,files,options={})=>act('upload',{...observedTarget(refOrLocator),files:Array.isArray(files) ? files : [files],...options}),
      drag: (from,to,options={})=>{
        const first=observedTarget(from),last=observedTarget(to);
        if(!last.ref) throw new Error('Drag destination requires an observed ref.');
        return act('drag',{...first,toRef:last.ref,...options});
      },
      dialog: (accept,text) => act('dialog',{accept:Boolean(accept),...(text===undefined ? {} : {text:String(text)})}),
      events, waitForEvent,
      expectEvent: async (kind,trigger,settings={})=>{const before=await events();await trigger();return waitForEvent(kind,{...settings,after:before.cursor});},
      waitForURL: (value,settings={})=>wait({expect:[{kind:'url',value,match:settings.match || 'equals'}],timeoutMs:settings.timeoutMs}),
      focus: () => { checkOpen(); return call('BrowserFocus', target); },
      operation: (operationId, mode = 'status') => {
        if (!['status','cancel','resume'].includes(mode)) throw new Error('Expected status, cancel or resume.');
        return call('BrowserAct', {...target,operationId,mode});
      },
      screenshot: async (settings = {}) => {
        checkOpen(); const boundary=boundaries.get(key);
        // Reading a page is safe for a background tab. A presented viewport is
        // requested explicitly because session activity does not prove that
        // the tab is visible in the user's window.
        const captureMode=settings.captureMode === undefined ? 'page-render' : settings.captureMode;
        const shot=await call('BrowserScreenshot', {...settings, captureMode, ...target});
        // Images reach the model only after the cell returns. A following cell
        // can use that observation; JavaScript itself cannot inspect the pixels.
        if(boundary && boundaries.get(key)===boundary && shot.observationId && !settings.fullPage && captureMode === 'viewport' && shot.coordinateEligible !== false) {
          const described=shot.visualObservation?.delivery==='text-description' && shot.description?.described===true
            && typeof shot.description.text==='string' && shot.description.text.trim().length>0;
          // A successful auxiliary description is already readable text in this
          // cell. It can release only the boundary that preceded this capture.
          if(described) { boundaries.delete(key); pendingScreenshots.delete(key); }
          else if(shot.modelImageObservation===true) pendingScreenshots.set(key,boundary);
        }
        return shot;
      },
      close: async () => { const result = await call('BrowserClose', target); closed.add(key); observations.delete(key); baselines.delete(key); boundaries.delete(key); return result; }
    });
  };
  const tabs = async (sessionId) => {
      const result = await call('BrowserTabs', sessionId ? {sessionId} : {});
      const listed = Array.isArray(result) ? result : result.tabs;
      if (!Array.isArray(listed)) throw new Error('BrowserTabs returned no tab list.');
      // Array properties disappear when a cell returns JSON. Keep the complete
      // observed binding on each item so the next cell never guesses a session.
      const items = listed.map(item => ({...item, sessionId:item.sessionId || result.sessionId || sessionId}));
      return aliases(items, {tabs:items, output:result, sessionId:result.sessionId, activeTabId:result.activeTabId});
    };
  const bind = async (result) => {
    if (!result.tabId || !result.sessionId) throw new Error('BROWSER_TARGET_REQUIRED: Binding requires sessionId and tabId.');
    const handle = tab(result.tabId, result.sessionId);
    const key = JSON.stringify([result.sessionId,result.tabId]);
    const page = observations.get(key) || await call('BrowserSnapshot', {sessionId:result.sessionId,tabId:result.tabId,backend:'session'});
    closed.delete(key);
    observations.set(key, pageView(page));
    return handle;
  };
  return Object.freeze({tab, tabs, documentation:docs,
    updateContext: next => {
      for (const [key,boundary] of pendingScreenshots) if(boundaries.get(key)===boundary) boundaries.delete(key);
      pendingScreenshots.clear();
      if (next.epoch !== options.epoch) { observations.clear(); baselines.clear(); }
      options = {...options,...next};
    },
    resetObservations: () => { observations.clear(); baselines.clear(); },
    getTab: async (tabId, settings = {}) => {
      const items = await tabs(settings.sessionId);
      const found = items.find(item => item.tabId === tabId);
      if (!found) throw new Error('BROWSER_TAB_NOT_FOUND: Select an observed tabId.');
      return bind({...found,sessionId:found.sessionId || items.sessionId || settings.sessionId});
    },
    open: async (url, settings = {}) => { const result = await call('BrowserOpen', {...settings, url}); return options.initialObservation ? bind(result) : tab(result.tabId, result.sessionId); }});
}
