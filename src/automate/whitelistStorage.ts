// Whitelist storage utilities

export interface WhitelistList {
  id: string;
  name: string;
  addresses: string[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'whitelistLists';

/**
 * Load saved whitelist lists from localStorage
 */
export const loadWhitelistLists = (): WhitelistList[] => {
  try {
    const savedListsJson = localStorage.getItem(STORAGE_KEY);
    if (savedListsJson) {
      return JSON.parse(savedListsJson);
    }
  } catch (error) {
    console.error('Error loading whitelist lists:', error);
  }
  return [];
};

/**
 * Save whitelist lists to localStorage
 */
export const saveWhitelistLists = (lists: WhitelistList[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  } catch (error) {
    console.error('Error saving whitelist lists:', error);
  }
};

/**
 * Create a new whitelist list
 */
export const createWhitelistList = (
  name: string,
  addresses: string[]
): WhitelistList => {
  return {
    id: `list_${Date.now()}`,
    name: name.trim(),
    addresses: [...addresses],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
};

/**
 * Add a new whitelist list to storage
 */
export const addWhitelistList = (list: WhitelistList): WhitelistList[] => {
  const currentLists = loadWhitelistLists();
  const updatedLists = [...currentLists, list];
  saveWhitelistLists(updatedLists);
  return updatedLists;
};

/**
 * Update an existing whitelist list
 */
export const updateWhitelistList = (updatedList: WhitelistList): WhitelistList[] => {
  const currentLists = loadWhitelistLists();
  const updatedLists = currentLists.map(list => 
    list.id === updatedList.id ? { ...updatedList, updatedAt: Date.now() } : list
  );
  saveWhitelistLists(updatedLists);
  return updatedLists;
};

/**
 * Delete a whitelist list by ID
 */
export const deleteWhitelistList = (listId: string): WhitelistList[] => {
  const currentLists = loadWhitelistLists();
  const updatedLists = currentLists.filter(list => list.id !== listId);
  saveWhitelistLists(updatedLists);
  return updatedLists;
};