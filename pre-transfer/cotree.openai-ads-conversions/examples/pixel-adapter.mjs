// Example integration for an existing browser analytics boundary. Load the official SDK separately.
const types={page_viewed:'contents',contents_viewed:'contents',items_added:'contents',checkout_started:'contents',order_created:'contents',lead_created:'customer_action',registration_completed:'customer_action',appointment_scheduled:'customer_action',subscription_created:'plan_enrollment',trial_started:'plan_enrollment',custom:'custom'};
export function createPixelAdapter(sdk,pixelId,{measurementAllowed=false}={}) {
  if(typeof sdk!=='function'||typeof pixelId!=='string'||!pixelId.trim()||typeof measurementAllowed!=='boolean')throw new Error('Pixel SDK, pixelId and measurement permission are required');
  let allowed=measurementAllowed;const seen=new Set();
  const invoke=(...args)=>{try{sdk(...args);return {queued:true,deliveryVerified:false};}catch{return {queued:false,reason:'Pixel SDK call failed; core conversion remains successful'};}};
  const consentReceipt=invoke('consent',allowed);const initReceipt=consentReceipt.queued?invoke('init',{pixelId}):{queued:false,reason:'Consent setup failed; initialization withheld'};
  const initialized=initReceipt.queued;allowed=Boolean(allowed&&consentReceipt.queued&&initialized);
  return {
    initialization:{consent:consentReceipt,init:initReceipt},
    consent(value){if(typeof value!=='boolean')throw new Error('Consent state must be boolean');const receipt=invoke('consent',value);allowed=Boolean(value&&receipt.queued&&initialized);return receipt;},
    measure(type,data,{eventId,optOut,customEventName}={}){
      if(!allowed)return {queued:false,reason:'Measurement is not allowed; blocked events are not replayed'};
      if(!Object.hasOwn(types,type)||data?.type!==types[type]||typeof eventId!=='string'||!eventId.trim())throw new Error('Documented browser event, data.type and stable eventId are required');
      if(optOut!==undefined&&typeof optOut!=='boolean')throw new Error('optOut must be boolean');
      if(type==='custom'&&(typeof customEventName!=='string'||!/^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,62}[A-Za-z0-9])?$/.test(customEventName)||Object.hasOwn(types,customEventName.toLowerCase())))throw new Error('Documented customEventName is required');
      const key=`${type}:${customEventName?.toLowerCase()??''}:${eventId}`;if(seen.has(key))return {queued:false,reason:'Already queued in this adapter instance'};
      const receipt=invoke('measure',type,data,{event_id:eventId,...(optOut===undefined?{}:{opt_out:optOut}),...(type==='custom'?{custom_event_name:customEventName}: {})});
      if(receipt.queued){seen.add(key);if(seen.size>1000)seen.delete(seen.values().next().value);}return receipt;
    },
    user(fields){
      if(!allowed)return {queued:false,reason:'Measurement is not allowed'};
      const hashes=['email_sha256','phone_number_sha256','external_id_sha256','first_name_sha256','last_name_sha256'],geo=['country','city','zip_code'];
      if(!fields||typeof fields!=='object'||Array.isArray(fields)||Object.keys(fields).some(k=>![...hashes,...geo].includes(k)))throw new Error('Only documented Pixel user fields are accepted');
      for(const [key,value]of Object.entries(fields)){if(typeof value!=='string'||!value.trim()||value.length>128)throw new Error('Pixel user values must be bounded nonempty strings');if(hashes.includes(key)&&!/^[a-f0-9]{64}$/.test(value))throw new Error('Identifiers must already be normalized SHA-256 values');}
      return invoke('init',{pixelId,user:structuredClone(fields)});
    }
  };
}
