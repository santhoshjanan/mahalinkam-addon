import { Folder } from './apiClient';

export interface TreeNode {
  id: number;
  name: string;
  depth: number;
  children: TreeNode[];
}

/**
 * Builds a nested tree from a flat folder array.
 *
 * - Roots (parent_id === null or parent not present) come first, sorted by position then name.
 * - Each level is sorted by position then name.
 * - Depth is 0-based (roots = 0).
 * - Orphans (parent_id points to non-existent folder) are treated as roots.
 * - Input array is not mutated.
 */
export function buildTree(folders: Folder[]): TreeNode[] {
  if (folders.length === 0) return [];

  // Create a map of id -> TreeNode for quick lookup
  const nodeMap = new Map<number, TreeNode>();
  const folderIds = new Set(folders.map((f) => f.id));

  // Initialize all nodes
  for (const folder of folders) {
    nodeMap.set(folder.id, {
      id: folder.id,
      name: folder.name,
      depth: 0, // Will be set later
      children: [],
    });
  }

  // Separate roots and non-roots
  const roots: TreeNode[] = [];
  const childToParent = new Map<number, number>(); // child id -> parent id

  for (const folder of folders) {
    const node = nodeMap.get(folder.id)!;
    // A folder is a root if parent_id is null or the parent doesn't exist in the folder list
    if (folder.parent_id === null || !folderIds.has(folder.parent_id)) {
      roots.push(node);
    } else {
      childToParent.set(folder.id, folder.parent_id);
      const parentNode = nodeMap.get(folder.parent_id)!;
      parentNode.children.push(node);
    }
  }

  // Recursive sort and depth setting
  const sortAndSetDepth = (nodes: TreeNode[], depth: number) => {
    // Sort by position then name
    const positionMap = new Map<number, number>();
    const nameMap = new Map<number, string>();

    for (const folder of folders) {
      positionMap.set(folder.id, folder.position);
      nameMap.set(folder.id, folder.name);
    }

    nodes.sort((a, b) => {
      const posA = positionMap.get(a.id) ?? 0;
      const posB = positionMap.get(b.id) ?? 0;
      if (posA !== posB) return posA - posB;
      const nameA = nameMap.get(a.id) ?? '';
      const nameB = nameMap.get(b.id) ?? '';
      return nameA.localeCompare(nameB);
    });

    // Set depth and recurse
    for (const node of nodes) {
      node.depth = depth;
      if (node.children.length > 0) {
        sortAndSetDepth(node.children, depth + 1);
      }
    }
  };

  sortAndSetDepth(roots, 0);

  return roots;
}

/**
 * Flattens a tree into a pre-order list for a <select> dropdown.
 *
 * Labels are indented with 2 spaces per depth level:
 * label = '  '.repeat(depth) + name
 */
export function flattenForSelect(nodes: TreeNode[]): { id: number; label: string }[] {
  const result: { id: number; label: string }[] = [];

  const preOrderWalk = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      result.push({
        id: node.id,
        label: '  '.repeat(node.depth) + node.name,
      });
      if (node.children.length > 0) {
        preOrderWalk(node.children);
      }
    }
  };

  preOrderWalk(nodes);
  return result;
}
