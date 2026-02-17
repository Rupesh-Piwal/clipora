"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus } from "lucide-react";

const faqs = [
    {
        question: "Is SnapCut free?",
        answer:
            "Yes, 100%. SnapCut is a fully open-source project with no paywalls, no 'Pro' plans, and no hidden subscriptions.",
    },
    {
        question: "Is there a recording limit?",
        answer:
            "Yes, you can only record up to 5 minutes and share it with a link.",
    },
    {
        question: "Do I need to install any software?",
        answer:
            "None. SnapCut works directly in your web browser using modern Canvas APIs. You don't need to download an .exe file or install a browser extension—making it the most secure and instant recording experience possible.",
    },
    {
        question: "What video qualities are supported?",
        answer:
            "You can record in different qualities including 720p and 1080p.",
    },
];

export function Faq() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section id="faqs" className="bg-[#0A0A0A] py-12 md:py-24 relative overflow-hidden scroll-mt-20">
            {/* Background decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-[#8B5CF6]/5 rounded-full blur-3xl" />
                <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-[#4f3095]/5 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto max-w-3xl px-6 relative z-10">
                <div className="mb-16 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-white/70 mb-6 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-[#4f3095]" />
                        FAQ
                    </div>
                    <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-4">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-lg text-white/40 font-light">
                        Everything you need to know about SnapCut.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="group border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 rounded-lg overflow-hidden transition-all duration-300"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="flex items-center justify-between w-full p-6 text-left"
                            >
                                <span className="text-lg font-medium text-white/90 group-hover:text-white transition-colors">
                                    {faq.question}
                                </span>
                                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-white/60 group-hover:text-white group-hover:bg-white/10 transition-all">
                                    <span className="absolute transition-transform duration-300 rotate-0">
                                        {openIndex === index ? <Minus size={18} /> : <Plus size={18} />}
                                    </span>
                                </div>
                            </button>
                            <AnimatePresence>
                                {openIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                    >
                                        <div className="px-6 pb-6 text-white/50 leading-relaxed font-light">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
