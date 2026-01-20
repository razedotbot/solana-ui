/**
 * UnifiedWalletManager - Shared wallet list management component
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Check,
  Download,
  Upload,
  Users,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import type { WalletList } from "./types";
import {
  loadCopyTradeWalletLists,
  saveCopyTradeWalletLists,
  loadWhitelistLists,
  saveWhitelistLists,
  createWalletList,
  createWhitelistList,
} from "./storage";

interface UnifiedWalletManagerProps {
  type: "copytrade" | "whitelist";
  onSelectList: (addresses: string[]) => void;
  selectedListId?: string | null;
  currentAddresses?: string[];
  onAddressesChange?: (addresses: string[]) => void;
}

const formatAddress = (address: string): string => {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const UnifiedWalletManager: React.FC<UnifiedWalletManagerProps> = ({
  type,
  onSelectList,
  selectedListId,
  currentAddresses = [],
  onAddressesChange,
}) => {
  const [savedLists, setSavedLists] = useState<WalletList[]>([]);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isEditingList, setIsEditingList] = useState<string | null>(null);
  const [editedListName, setEditedListName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load functions based on type
  const loadLists =
    type === "copytrade" ? loadCopyTradeWalletLists : loadWhitelistLists;
  const saveLists =
    type === "copytrade" ? saveCopyTradeWalletLists : saveWhitelistLists;
  const createList =
    type === "copytrade" ? createWalletList : createWhitelistList;

  // Load saved lists on mount
  useEffect(() => {
    const lists = loadLists();
    setSavedLists(lists);
  }, [type, loadLists]);

  // Save lists whenever they change
  useEffect(() => {
    saveLists(savedLists);
  }, [savedLists, type, saveLists]);

  // Filter lists by search term
  const filteredLists = savedLists.filter(
    (list) =>
      list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      list.addresses.some((addr) =>
        addr.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  const handleSaveCurrentList = (): void => {
    if (!newListName.trim() || currentAddresses.length === 0) return;

    const newList = createList(newListName, currentAddresses);
    setSavedLists((prev) => [...prev, newList]);
    setNewListName("");
    setIsCreatingList(false);
  };

  const handleUpdateListName = (listId: string): void => {
    if (!editedListName.trim()) return;

    setSavedLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? { ...list, name: editedListName.trim(), updatedAt: Date.now() }
          : list,
      ),
    );
    setIsEditingList(null);
    setEditedListName("");
  };

  const handleDeleteList = (listId: string): void => {
    setSavedLists((prev) => prev.filter((list) => list.id !== listId));
    if (selectedListId === listId) {
      onSelectList([]);
    }
  };

  const handleSelectList = (list: WalletList): void => {
    onSelectList(list.addresses);
    if (onAddressesChange) {
      onAddressesChange(list.addresses);
    }
  };

  const handleAddAddress = (listId: string): void => {
    const address = newAddress.trim();
    if (!address || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return;

    setSavedLists((prev) =>
      prev.map((list) => {
        if (list.id === listId && !list.addresses.includes(address)) {
          const updated = {
            ...list,
            addresses: [...list.addresses, address],
            updatedAt: Date.now(),
          };
          if (selectedListId === listId && onAddressesChange) {
            onAddressesChange(updated.addresses);
          }
          return updated;
        }
        return list;
      }),
    );
    setNewAddress("");
  };

  const handleRemoveAddress = (listId: string, address: string): void => {
    setSavedLists((prev) =>
      prev.map((list) => {
        if (list.id === listId) {
          const updated = {
            ...list,
            addresses: list.addresses.filter((a) => a !== address),
            updatedAt: Date.now(),
          };
          if (selectedListId === listId && onAddressesChange) {
            onAddressesChange(updated.addresses);
          }
          return updated;
        }
        return list;
      }),
    );
  };

  const handleExportList = (list: WalletList): void => {
    const content = list.addresses.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${list.name.replace(/\s+/g, "_")}_${type}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (
    event: React.ChangeEvent<HTMLInputElement>,
    listId?: string,
  ): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const addresses = content
        .split(/[\n,]/)
        .map((addr) => addr.trim())
        .filter((addr) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr));

      if (addresses.length === 0) return;

      if (listId) {
        // Add to existing list
        setSavedLists((prev) =>
          prev.map((list) => {
            if (list.id === listId) {
              const existingSet = new Set(list.addresses);
              const newAddrs = addresses.filter((a) => !existingSet.has(a));
              if (newAddrs.length > 0) {
                const updated = {
                  ...list,
                  addresses: [...list.addresses, ...newAddrs],
                  updatedAt: Date.now(),
                };
                if (selectedListId === listId && onAddressesChange) {
                  onAddressesChange(updated.addresses);
                }
                return updated;
              }
            }
            return list;
          }),
        );
      } else {
        // Create new list from file
        const fileName = file.name.replace(/\.txt$/, "").replace(/[_-]/g, " ");
        const newList = createList(fileName, addresses);
        setSavedLists((prev) => [...prev, newList]);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-mono font-medium text-app-primary flex items-center gap-2">
          <Users className="w-4 h-4 text-app-secondary-60" />
          {type === "copytrade" ? "Wallet Lists" : "Whitelist Lists"}
        </h4>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv"
            className="hidden"
            onChange={(e) => handleFileImport(e)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 bg-app-accent border border-app-primary-40 rounded text-xs font-mono text-app-secondary-80
                       hover:bg-app-primary-20 hover:text-app-primary transition-colors flex items-center gap-1.5"
            title="Import from file"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
          {currentAddresses.length > 0 && (
            <button
              onClick={() => setIsCreatingList(true)}
              className="px-2.5 py-1.5 bg-success-20 border border-success/30 rounded text-xs font-mono text-success
                         hover:bg-success-40 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Save Current
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      {savedLists.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-secondary-60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search lists..."
            className="w-full pl-9 pr-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                       focus:outline-none focus:border-app-primary-60 transition-colors placeholder:text-app-secondary-60"
          />
        </div>
      )}

      {/* New List Input */}
      {isCreatingList && (
        <div className="flex items-center gap-2 p-3 bg-app-primary-10 border border-app-primary-40 rounded-lg">
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="List name..."
            className="flex-1 px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                       focus:outline-none focus:border-app-primary-60 transition-colors placeholder:text-app-secondary-60"
            onKeyDown={(e) => e.key === "Enter" && handleSaveCurrentList()}
            autoFocus
          />
          <button
            onClick={handleSaveCurrentList}
            disabled={!newListName.trim() || currentAddresses.length === 0}
            className="p-2 bg-success-20 border border-success/30 rounded text-success
                       hover:bg-success-40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsCreatingList(false);
              setNewListName("");
            }}
            className="p-2 bg-app-primary-20 rounded text-app-secondary-60 hover:bg-app-primary-40 hover:text-app-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Lists */}
      {savedLists.length === 0 ? (
        <div className="text-center py-8 text-app-secondary-60 font-mono text-sm">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No lists saved yet</p>
          <p className="text-xs mt-1 text-app-secondary-40">
            Import a file or save current addresses
          </p>
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="text-center py-6 text-app-secondary-60 font-mono text-sm">
          No lists match your search
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
          {filteredLists.map((list) => (
            <div
              key={list.id}
              className={`
                border rounded-lg overflow-hidden transition-all duration-200
                ${
                  selectedListId === list.id
                    ? "border-success/50"
                    : "border-app-primary-40 hover:border-app-primary-60"
                }
              `}
            >
              {/* List Header */}
              <div className="flex items-center justify-between p-3">
                {isEditingList === list.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editedListName}
                      onChange={(e) => setEditedListName(e.target.value)}
                      className="flex-1 px-2 py-1 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                                 focus:outline-none focus:border-app-primary-60"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateListName(list.id);
                        if (e.key === "Escape") {
                          setIsEditingList(null);
                          setEditedListName("");
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdateListName(list.id)}
                      className="p-1 rounded text-success hover:bg-success-20"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingList(null);
                        setEditedListName("");
                      }}
                      className="p-1 rounded text-app-secondary-60 hover:bg-app-primary-20"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleSelectList(list)}
                      className="flex items-center gap-3 flex-1 text-left group"
                    >
                      <span
                        className={`
                        w-2 h-2 rounded-full transition-colors
                        ${selectedListId === list.id ? "bg-success" : "bg-app-secondary-40 group-hover:bg-app-secondary-60"}
                      `}
                      />
                      <div>
                        <span className="font-mono text-sm text-app-primary">
                          {list.name}
                        </span>
                        <span className="ml-2 font-mono text-xs text-app-secondary-60">
                          ({list.addresses.length})
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setExpandedListId(
                            expandedListId === list.id ? null : list.id,
                          )
                        }
                        className="p-1.5 rounded text-app-secondary-60 hover:text-app-secondary-80 hover:bg-app-primary-20 transition-colors"
                        title="Show addresses"
                      >
                        {expandedListId === list.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleExportList(list)}
                        className="p-1.5 rounded text-app-secondary-60 hover:text-app-secondary-80 hover:bg-app-primary-20 transition-colors"
                        title="Export"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingList(list.id);
                          setEditedListName(list.name);
                        }}
                        className="p-1.5 rounded text-app-secondary-60 hover:text-app-secondary-80 hover:bg-app-primary-20 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteList(list.id)}
                        className="p-1.5 rounded text-app-secondary-60 hover:text-error-alt hover:bg-error-alt-20 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Expanded Addresses Panel */}
              {expandedListId === list.id && (
                <div className="px-3 pb-3 border-t border-app-primary-20">
                  {/* Add Address Input */}
                  <div className="flex items-center gap-2 mt-3 mb-2">
                    <input
                      type="text"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder="Add wallet address..."
                      className="flex-1 px-2 py-1.5 bg-app-quaternary border border-app-primary-30 rounded font-mono text-xs text-app-primary
                                 focus:outline-none focus:border-app-primary-60 placeholder:text-app-secondary-60"
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleAddAddress(list.id)
                      }
                    />
                    <button
                      onClick={() => handleAddAddress(list.id)}
                      disabled={!newAddress.trim()}
                      className="p-1.5 bg-app-accent border border-app-primary-40 rounded text-app-secondary-60
                                 hover:bg-app-primary-20 hover:text-app-primary transition-colors
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Address List */}
                  {list.addresses.length === 0 ? (
                    <div className="text-center py-3 text-app-secondary-40 font-mono text-xs">
                      No addresses in this list
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {list.addresses.map((address) => (
                        <div
                          key={address}
                          className="flex items-center justify-between p-2 bg-app-primary-10 rounded group"
                        >
                          <span
                            className="font-mono text-xs text-app-secondary-80"
                            title={address}
                          >
                            {formatAddress(address)}
                          </span>
                          <button
                            onClick={() =>
                              handleRemoveAddress(list.id, address)
                            }
                            className="p-0.5 rounded text-app-secondary-40 hover:text-error-alt
                                       opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnifiedWalletManager;
