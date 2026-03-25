"use client";

import { X, FileText, Upload, MessageSquare, CheckCircle, Clock, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { type PipelineCase } from "@/lib/data/mockConsoleData";
import toast from "react-hot-toast";

interface SlideOverPanelProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: PipelineCase | null;
}

export function SlideOverPanel({ isOpen, onClose, caseData }: SlideOverPanelProps) {
  if (!isOpen || !caseData) return null;

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-40 transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )} 
        onClick={onClose}
      />
      
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-full md:w-[560px] bg-[#F0F4FF] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-blue-200 flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-blue-200 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{caseData.id}</h2>
            <p className="text-sm text-slate-300">{caseData.customer} &bull; {caseData.serviceType}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-blue-50 text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Status Section */}
          <div className="bg-white p-4 rounded-xl border border-blue-200">
            <h3 className="text-xs font-bold text-[#33A1FD] uppercase tracking-wider mb-2">Current Status</h3>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-900">{caseData.stage.replaceAll("_", " ")}</span>
              <span className="text-sm text-slate-300 flex items-center gap-1">
                <Clock className="w-4 h-4" /> SLA: {caseData.slaTimer}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Internal Communication</h3>
            <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-3">
              <p className="text-sm text-slate-700">@Meera Please review passport glare on latest upload.</p>
              <p className="text-sm text-slate-300">@Nimit Audit complete. Moving to review queue.</p>
              <div className="flex gap-2">
                <button className="text-xs px-2 py-1 rounded bg-[#33A1FD]/20 text-[#33A1FD]">@mention</button>
                <button className="text-xs px-2 py-1 rounded bg-[#B87333]/20 text-[#B87333]">Notes</button>
                <button className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300">Activity Log</button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Document Management</h3>
            <div className="space-y-2">
              {[
                ["Passport", "Uploaded ✅", "PASSPORT_DeepaMehta_2026.pdf"],
                ["OCI Card", "Missing ❌", "Not available"],
                ["Address Proof", "Blurry ⚠️", "Glare detected"],
                ["Photos", "Uploaded ✅", "PHOTO_SET_DeepaMehta_2026.zip"],
                ["Self-Declaration", "Expired ⚠️", "Expired document"],
              ].map(([label, status, helper]) => (
                <div key={label} className="bg-white border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-900">{label}</span>
                    <span className="text-xs text-slate-300">{status}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{helper}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 bg-white border border-blue-200 text-slate-700 py-2 px-4 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors">
                <FileText className="w-4 h-4 text-[#33A1FD]" /> Request Docs
              </button>
              <button className="flex items-center justify-center gap-2 bg-white border border-blue-200 text-slate-700 py-2 px-4 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors">
                <Upload className="w-4 h-4 text-green-400" /> Upload Docs
              </button>
              <button className="flex items-center justify-center gap-2 bg-white border border-blue-200 text-slate-700 py-2 px-4 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors">
                <MessageSquare className="w-4 h-4 text-violet-300" /> Add Note
              </button>
              <button
                onClick={() => toast.success(`Moved ${caseData.id} to next stage`)}
                className="flex items-center justify-center gap-2 bg-[#B87333] text-white py-2 px-4 rounded-lg hover:brightness-110 text-sm font-medium transition-colors border border-[#B87333]/80 shadow-sm"
              >
                <CheckCircle className="w-4 h-4" /> Move to Next
              </button>
            </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 bg-white border border-blue-200 text-slate-700 py-2 rounded-lg">
            <Paperclip className="w-4 h-4" /> Attach File
          </button>
        </div>
      </div>
    </>
  );
}
