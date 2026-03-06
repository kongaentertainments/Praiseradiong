import { motion, AnimatePresence } from "motion/react";
import { X, Heart, DollarSign, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const [amount, setAmount] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<{ stripeConfigured: boolean; stripeKeyValid: boolean } | null>(null);

  // Check config on mount
  useEffect(() => {
    fetch("/api/config-status")
      .then(res => res.json())
      .then(data => setConfigStatus(data))
      .catch(() => setConfigStatus({ stripeConfigured: false, stripeKeyValid: false }));
  }, []);

  const handleDonate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Server error response:", data);
        throw new Error(data.error || "Failed to create checkout session");
      }

      const data = await response.json();
      console.log("Checkout session created successfully:", data);
      
      if (data.url) {
        // In the AI Studio iframe environment, we must open the Stripe URL in a new window/tab
        // because Stripe Checkout cannot be loaded inside an iframe (X-Frame-Options: DENY)
        const stripeWindow = window.open(data.url, "_blank");
        
        if (!stripeWindow) {
          throw new Error("Popup blocked! Please allow popups for this site to complete your donation.");
        }
        
        // Close the modal after opening the checkout page
        onClose();
      } else {
        throw new Error("Stripe did not return a checkout URL. Please check your Stripe dashboard configuration.");
      }
    } catch (err: any) {
      console.error("Donation error:", err.message || "Unknown error");
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#001A33]/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-[#003366] hover:bg-slate-100 rounded-full transition-all"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-4">
                <Heart size={32} fill="currentColor" />
              </div>
              <h2 className="text-2xl font-black text-[#003366]">Support PraiseRadioNG</h2>
              <p className="text-slate-500 mt-2">Your donations help us keep the gospel message on the airwaves.</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Select Amount (USD)</label>
                <div className="grid grid-cols-3 gap-3">
                  {[10, 25, 50, 100, 250, 500].map((val) => (
                    <button
                      key={val}
                      onClick={() => setAmount(val)}
                      className={`py-3 rounded-xl font-bold transition-all border ${
                        amount === val 
                          ? "bg-[#003366] text-white border-[#003366]" 
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                  <DollarSign size={16} />
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-10 pr-4 font-bold text-[#003366] focus:outline-none focus:border-blue-500"
                  placeholder="Custom Amount"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium">
                  {error}
                </div>
              )}

              {configStatus && !configStatus.stripeConfigured && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  <p className="font-bold mb-1">⚠️ Stripe Not Configured</p>
                  <p>Please add <strong>STRIPE_SECRET_KEY</strong> to your Environment Variables in AI Studio settings.</p>
                </div>
              )}

              {configStatus && configStatus.stripeConfigured && !configStatus.stripeKeyValid && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
                  <p className="font-bold mb-1">❌ Invalid API Key Type</p>
                  <p>The key you provided starts with <code>mk_</code>. Please use a <strong>Secret Key</strong> starting with <code>sk_test_</code> or <code>sk_live_</code>.</p>
                </div>
              )}

              <button
                onClick={handleDonate}
                disabled={loading || amount <= 0 || (configStatus !== null && !configStatus.stripeConfigured)}
                className="w-full py-4 bg-[#0056b3] text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg hover:bg-[#004494] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Processing...
                  </>
                ) : !configStatus?.stripeConfigured ? (
                  "Setup Required"
                ) : (
                  <>
                    Donate Now
                    <Heart size={16} />
                  </>
                )}
              </button>
              
              <p className="text-[10px] text-center text-slate-400 uppercase tracking-wider">
                Secure payment powered by Stripe
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
