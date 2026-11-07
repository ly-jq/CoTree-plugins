import { lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export function projectName(value) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{1,47}$/.test(value)) throw new Error('Name must be 2..48 lowercase letters, digits or hyphens, starting with a letter.');
  return value;
}
export function readTree(directory, include = () => true) {
  const files = {};
  function visit(folder, prefix) {
    if (lstatSync(folder).isSymbolicLink()) throw new Error('Linked template directories are not supported.');
    for (const item of readdirSync(folder, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${item.name}` : item.name;
      if (!include(relative, item.isDirectory())) continue;
      const full = path.join(folder, item.name);
      if (item.isSymbolicLink()) throw new Error('Linked template files are not supported.');
      if (item.isDirectory()) visit(full, relative);
      else if (item.isFile()) files[relative] = readFileSync(full);
      else throw new Error('Unsupported template file type.');
    }
  }
  visit(path.resolve(directory), ''); return files;
}
export function writeNewProject(output, files) {
  if (typeof output !== 'string' || !output.trim()) throw new Error('Choose a new output directory.');
  const root = path.resolve(output), parent = path.dirname(root);
  if (root === parent) throw new Error('A filesystem root is not a project directory.');
  if (!lstatSync(parent).isDirectory()) throw new Error('Create the output parent directory first.');
  const resolved = Object.entries(files).map(([relative, contents]) => {
    if (!relative || path.isAbsolute(relative) || relative.split(/[\\/]/).some(part => !part || part === '.' || part === '..') || relative.includes(':')) throw new Error('Unsafe project resource path.');
    return [path.join(root, relative), contents];
  });
  // Exclusive directory creation also refuses an empty existing directory or a link.
  mkdirSync(root);
  for (const [file, contents] of resolved) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, contents, { flag: 'wx' });
  }
  return { output: root, files: resolved.length, dependenciesInstalled: false, published: false };
}
