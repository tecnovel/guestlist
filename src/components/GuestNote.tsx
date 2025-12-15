'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';

export function GuestNote({ note }: { note?: string | null }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!note) return null;

    return (
        <div className="flex items-center gap-2 max-w-[150px] sm:max-w-xs">
            <p className="truncate text-xs text-gray-500">{note}</p>
            {note.length > 20 && (
                <>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="text-gray-500 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
                        title="View full note"
                    >
                        <Eye className="w-3 h-3" />
                    </button>

                    {isOpen && (
                        <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                            <div className="flex items-center justify-center min-h-screen px-4">
                                <div className="fixed inset-0 bg-black/80 transition-opacity" onClick={() => setIsOpen(false)} />
                                <div className="relative bg-gray-900 rounded-lg p-6 max-w-sm w-full border border-gray-800 shadow-xl">
                                    <h3 className="text-lg font-medium text-white mb-2">Guest Note</h3>
                                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{note}</p>
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
