import { describe, it, expect } from 'vitest';
import { buildTree, flattenForSelect } from '../folderTree';
import type { Folder } from '../apiClient';

const folders: Folder[] = [
  { id: 1, parent_id: null, name: 'Reading', position: 1 },
  { id: 2, parent_id: 1, name: 'Tech', position: 1 },
  { id: 3, parent_id: null, name: 'Archive', position: 2 },
  { id: 4, parent_id: 1, name: 'Fiction', position: 0 },
];

describe('folderTree', () => {
  it('builds a sorted nested tree with depth', () => {
    const tree = buildTree(folders);
    expect(tree.map((n) => n.name)).toEqual(['Reading', 'Archive']);
    expect(tree[0].children.map((n) => n.name)).toEqual(['Fiction', 'Tech']); // by position
    expect(tree[0].children[0].depth).toBe(1);
  });

  it('flattens with indentation', () => {
    const flat = flattenForSelect(buildTree(folders));
    expect(flat.find((f) => f.id === 2)?.label).toContain('Tech');
    expect(flat.find((f) => f.id === 2)?.label.startsWith(' ')).toBe(true);
  });
});
