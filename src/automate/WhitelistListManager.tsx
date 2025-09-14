import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Save, X, Check, ArrowRight, Download, Upload } from 'lucide-react';
import { WhitelistList, loadWhitelistLists, saveWhitelistLists, createWhitelistList, deleteWhitelistList, updateWhitelistList } from './whitelistStorage';

interface WhitelistListManagerProps {
  onSelectList: (addresses: string[]) => void;
  currentAddresses?: string[];
}

const WhitelistListManager: React.FC<WhitelistListManagerProps> = ({ onSelectList, currentAddresses = [] }) => {
  const [savedLists, setSavedLists] = useState<WhitelistList[]>([]);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isEditingList, setIsEditingList] = useState<string | null>(null);
  const [editedListName, setEditedListName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load saved lists on component mount
  useEffect(() => {
    const lists = loadWhitelistLists();
    setSavedLists(lists);
  }, []);
  
  // Save lists to localStorage whenever they change
  useEffect(() => {
    saveWhitelistLists(savedLists);
  }, [savedLists]);
  
  const handleSaveCurrentList = () => {
    if (!newListName.trim() || currentAddresses.length === 0) {
      return;
    }
    
    const newList = createWhitelistList(newListName, currentAddresses);
    setSavedLists([...savedLists, newList]);
    setNewListName('');
    setIsCreatingList(false);
  };
  
  const handleUpdateListName = (listId: string) => {
    if (!editedListName.trim()) {
      return;
    }
    
    const listToUpdate = savedLists.find(list => list.id === listId);
    if (listToUpdate) {
      const updatedList = { ...listToUpdate, name: editedListName.trim() };
      const newLists = updateWhitelistList(updatedList);
      setSavedLists(newLists);
    }
    
    setIsEditingList(null);
    setEditedListName('');
  };
  
  const handleDeleteList = (listId: string) => {
    const newLists = deleteWhitelistList(listId);
    setSavedLists(newLists);
  };
  
  const handleSelectList = (addresses: string[]) => {
    if (onSelectList) {
      onSelectList(addresses);
    }
  };
  
  const handleExportList = (list: WhitelistList) => {
    // Create a text file with one address per line
    const content = list.addresses.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link and trigger it
    const a = document.createElement('a');
    a.href = url;
    a.download = `${list.name.replace(/\s+/g, '_')}_addresses.txt`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleImportList = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      
      // Split by newline and filter out empty lines
      const addresses = content.split(/\r?\n/).filter(line => line.trim() !== '');
      
      if (addresses.length > 0) {
        // Create a new list with the imported addresses
        const fileName = file.name.replace(/\.txt$/, '').replace(/[_-]/g, ' ');
        const newList = createWhitelistList(fileName, addresses);
        setSavedLists([...savedLists, newList]);
      }
    };
    
    reader.readAsText(file);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const startEditingList = (list: WhitelistList) => {
    setIsEditingList(list.id);
    setEditedListName(list.name);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-mono font-semibold color-primary">Saved Whitelist Lists</h4>
        {!isCreatingList ? (
          <div className="flex space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 bg-app-accent border border-app-primary-40 rounded color-primary font-mono text-xs hover:bg-app-primary hover:border-app-primary transition-colors flex items-center gap-1"
              title="Import list from TXT file"
            >
              <Upload className="w-3 h-3" />
              Import
            </button>
            <button
              onClick={() => setIsCreatingList(true)}
              className="px-2 py-1 bg-app-accent border border-app-primary-40 rounded color-primary font-mono text-xs hover:bg-app-primary hover:border-app-primary transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Save Current List
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportList} 
              accept=".txt" 
              className="hidden" 
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="px-2 py-1 bg-app-primary border border-app-primary-40 rounded font-mono text-xs color-primary focus:outline-none focus:border-app-primary"
              placeholder="List name"
            />
            <button
              onClick={handleSaveCurrentList}
              disabled={!newListName.trim() || currentAddresses.length === 0}
              className="p-1 bg-app-accent border border-app-primary-40 rounded color-primary font-mono text-xs hover:bg-app-primary hover:border-app-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setIsCreatingList(false);
                setNewListName('');
              }}
              className="p-1 border border-app-primary-40 rounded color-primary font-mono text-xs hover:bg-app-primary hover:border-app-primary transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      
      {savedLists.length === 0 ? (
        <div className="text-center py-3 text-app-secondary-60 font-mono text-xs">
          No saved lists. Create one by saving your current whitelist.
        </div>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {savedLists.map(list => (
            <div key={list.id} className="flex items-center justify-between bg-app-primary-20 p-2 rounded border border-app-primary-40">
              {isEditingList === list.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editedListName}
                    onChange={(e) => setEditedListName(e.target.value)}
                    className="px-2 py-1 bg-app-primary border border-app-primary-40 rounded font-mono text-xs color-primary focus:outline-none focus:border-app-primary flex-1"
                  />
                  <button
                    onClick={() => handleUpdateListName(list.id)}
                    disabled={!editedListName.trim()}
                    className="p-1 bg-app-accent border border-app-primary-40 rounded color-primary font-mono text-xs hover:bg-app-primary hover:border-app-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingList(null);
                      setEditedListName('');
                    }}
                    className="p-1 border border-app-primary-40 rounded color-primary font-mono text-xs hover:bg-app-primary hover:border-app-primary transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="font-mono text-xs color-primary">{list.name}</div>
                    <div className="text-xs text-app-secondary-60">{list.addresses.length} addresses</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSelectList(list.addresses)}
                      className="p-1 bg-app-accent border border-app-primary-40 rounded color-primary font-mono text-xs hover:bg-app-primary hover:border-app-primary transition-colors flex items-center"
                      title="Use this list"
                    >
                      <ArrowRight className="w-3 h-3" />
                      <span className="ml-1">Select</span>
                    </button>
                    <button
                      onClick={() => handleExportList(list)}
                      className="p-1 border border-app-primary-40 rounded color-primary font-mono text-xs hover:bg-app-primary hover:border-app-primary transition-colors"
                      title="Export as TXT"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => startEditingList(list)}
                      className="p-1 border border-app-primary-40 rounded color-primary font-mono text-xs hover:bg-app-primary hover:border-app-primary transition-colors"
                      title="Edit list name"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteList(list.id)}
                      className="p-1 border border-error-alt-40 rounded text-error-alt font-mono text-xs hover:bg-error-20 hover:border-error-alt transition-colors"
                      title="Delete list"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WhitelistListManager;