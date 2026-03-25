"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudUpload, FileText, CheckCircle, X } from "lucide-react";

interface FileDropZoneProps {
  label: string;
  accept: string;
  maxSizeMsg: string;
  onUpload: (file: File | null) => void;
  file: File | null;
  error?: string;
}

export function FileDropZone({ label, accept, maxSizeMsg, onUpload, file, error }: FileDropZoneProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovered(true);
  };
  const handleDragLeave = () => setIsHovered(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovered(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: isHovered ? 1.01 : 1 }}
            exit={{ opacity: 0 }}
            className={`relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-[14px] border-2 border-dashed transition-colors ${
              isHovered ? "border-accent bg-[#FFFBF0] scale-[1.02]" : error ? "border-red bg-redL/50" : "border-border bg-white hover:border-accent/50 hover:bg-gray-50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
              isHovered ? "bg-accent text-white" : "bg-accent/10 text-accent"
            }`}>
              <CloudUpload className="w-6 h-6" />
            </div>
            <p className="font-body font-bold text-primary mb-1 text-center">{label}</p>
            <p className="font-body text-sm text-muted text-center max-w-[200px] mb-2">
              Drag & drop or <span className="text-accent font-bold underline">browse</span>
            </p>
            <p className="font-mono text-[11px] text-ui-muted">{maxSizeMsg}</p>
          </motion.div>
        ) : (
          <motion.div
            key="filecard"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex items-center gap-3 bg-greenL border-2 border-green rounded-xl p-3 sm:p-4 shadow-[0_4px_16px_rgba(22,163,74,0.1)] relative overflow-hidden group"
          >
            <div className="bg-white p-2 rounded-lg text-green-600 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body font-bold text-green-800 text-sm truncate">{file.name}</p>
              <p className="font-mono text-[11px] text-green-600/80">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mr-2" />
            
            <button
              onClick={() => onUpload(null)}
              className="absolute right-0 top-0 bottom-0 px-4 bg-redL text-red font-bold text-sm flex items-center gap-1 border-l border-red/20 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
            >
              <X className="w-4 h-4" /> Remove
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {error && !file && <p className="text-ui-red text-sm font-bold mt-2 text-center">{error}</p>}
    </div>
  );
}
