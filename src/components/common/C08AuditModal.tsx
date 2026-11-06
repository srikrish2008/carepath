import React from 'react';
import { ShieldCheck, FileCode, CheckCircle2, RotateCcw } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Modal } from './Modal';
import { Button } from './Button';

interface C08AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const C08AuditModal: React.FC<C08AuditModalProps> = ({ isOpen, onClose }) => {
  const { c08MissingKeys, clearC08AuditLog, c08SimulationActive, setC08SimulationActive, language } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Constraint C08 — Translation Resolution Audit Log"
      description="Real-time audit log of translation keys resolved via fallback protection when translations are incomplete or missing."
      maxWidth="3xl"
    >
      <div className="space-y-5 text-xs">
        {/* Scenario Controls Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 text-sm">
                Controlled Demonstration Scenario (C08)
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Simulates an overnight upstream translation change where a non-critical Tamil string is missing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setC08SimulationActive(!c08SimulationActive)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                c08SimulationActive
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
              }`}
            >
              {c08SimulationActive ? 'Disable C08 Scenario' : 'Enable C08 Scenario'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-[11px]">
            <div>
              <span className="text-slate-400 font-medium">Active UI Language: </span>
              <strong className="text-slate-800 uppercase">{language}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Scenario Status: </span>
              <strong className={c08SimulationActive ? 'text-amber-700' : 'text-emerald-700'}>
                {c08SimulationActive ? 'Simulation Active' : 'Normal Complete Mode'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Missing Keys Logged: </span>
              <strong className="text-slate-800">{c08MissingKeys.length}</strong>
            </div>
          </div>
        </div>

        {/* Audit Log Entries Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Detected Fallback Events ({c08MissingKeys.length})
            </h4>
            {c08MissingKeys.length > 0 && (
              <button
                type="button"
                onClick={clearC08AuditLog}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear Audit Log</span>
              </button>
            )}
          </div>

          {c08MissingKeys.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <div className="font-semibold text-slate-800">
                All Requested Translations Resolved Successfully
              </div>
              <p className="text-slate-500 text-[11px] max-w-md mx-auto">
                No missing keys or empty strings have been encountered in the current session. To test C08 fallback resilience, enable the simulation scenario above and navigate to the booking modal.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {c08MissingKeys.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-teal-900 flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-teal-700" />
                      {entry.key}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        entry.simulated
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {entry.simulated ? 'C08 Simulated' : 'Incomplete Translation'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600">
                    <span className="font-medium text-slate-400">English Fallback Displayed: </span>
                    <span className="text-slate-800 italic">&ldquo;{entry.fallbackText}&rdquo;</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>
                      Requested: <strong className="uppercase">{entry.requestedLanguage}</strong> → Fallback: <strong className="uppercase">{entry.fallbackLanguage}</strong>
                    </span>
                    <span>Workflow State: <strong className="text-emerald-700">Unblocked &amp; Intact</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Safety & Constraint Guarantees */}
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-950 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-teal-700 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Constraint C08 Safety Guarantee:</span> Missing or incomplete translations are never rendered as <code className="bg-teal-100 px-1 rounded">undefined</code>, raw keys, or blank space. CarePath substitutes reviewed English sources and marks them clearly, ensuring clinical instructions remain fully verifiable.
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="sm" onClick={onClose}>
            Close Audit Log
          </Button>
        </div>
      </div>
    </Modal>
  );
};
