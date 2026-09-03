"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";

export default function Home() {
  // --- Pre-Wake Render Servers ---
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PYTHON_API_URL) {
      fetch(process.env.NEXT_PUBLIC_PYTHON_API_URL).catch(() => {});
    }
    if (process.env.NEXT_PUBLIC_NODE_API_URL) {
      fetch(process.env.NEXT_PUBLIC_NODE_API_URL).catch(() => {});
    }
  }, []);
  // -------------------------------

  const [resume, setResume] = useState(null);
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [improving, setImproving] = useState(false);
  const [improvedResume, setImprovedResume] = useState(null);
  const [inputType, setInputType] = useState("file"); // 'file' or 'text'
  const [pastedResume, setPastedResume] = useState("");

  const loadingPhrases = [
    "Reading your resume...",
    "Analyzing job description keywords...",
    "Drafting perfect bullet points...",
    "Polishing formatting..."
  ];
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  useEffect(() => {
    let interval;
    if (improving) {
      setLoadingTextIndex(0);
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % loadingPhrases.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [improving]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setResume(e.target.files[0]);
    }
  };

  const handleClearResume = () => {
    setResume(null);
    setPastedResume("");
    setResult(null);
    setError("");
    setImprovedResume(null);
  };

  const handleImprove = async () => {
    setImproving(true);
    setError("");
    try {
      let resumeText = "";
      if (inputType === "file") {
        if (!resume) throw new Error("Please upload a resume first.");
        const formData = new FormData();
        formData.append("resume", resume);
        const parseRes = await axios.post(`${process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://localhost:8000"}/parse`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        resumeText = parseRes.data.text;
      } else {
        resumeText = pastedResume;
      }

      if (!resumeText || !jd) throw new Error("Missing resume text or job description.");

      const improveRes = await axios.post(`${process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://localhost:8000"}/improve`, {
        resume: resumeText,
        jd: jd
      });
      setImprovedResume(improveRes.data.improved_resume);
      toast.success("Resume rewritten successfully!");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "An error occurred during AI rewrite.");
    } finally {
      setImproving(false);
    }
  };

  const handleMatch = async (e) => {
    e.preventDefault();
    const currentResume = inputType === "file" ? resume : pastedResume;
    if (!currentResume || !jd.trim()) {
      setError("Please provide both a resume and a job description.");
      return;
    }
    
    setError("");
    setLoading(true);
    setResult(null);

    try {
      let resumeText = "";
      if (inputType === "file") {
        const formData = new FormData();
        formData.append("resume", resume);
        const parseRes = await axios.post(`${process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://localhost:8000"}/parse`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        resumeText = parseRes.data.text;
      } else {
        resumeText = pastedResume;
      }

      const matchRes = await axios.post(`${process.env.NEXT_PUBLIC_NODE_API_URL || "http://localhost:5000"}/match`, {
        resume: resumeText,
        jd: jd
      });

      setResult({
        score: matchRes.data.score,
        message: matchRes.data.message
      });
      toast.success("Analysis complete!");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "An error occurred during matching.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden">
      <Toaster position="bottom-right" />
      {/* Animated Background SVG / CSS Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex justify-center items-center">
        <div className="absolute w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-blue-600/20 rounded-full blur-[100px] -top-20 -left-20 animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-purple-600/20 rounded-full blur-[120px] bottom-10 right-10 animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-3xl flex flex-col gap-8">
        
        <div className="text-center flex flex-col items-center">
          <img src="/logo.png" alt="Fitly Logo" className="w-24 h-24 object-contain mb-4 drop-shadow-[0_0_20px_rgba(236,72,153,0.3)] animate-in zoom-in duration-700" />
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
            Fitly
          </h1>
          <p className="mt-3 text-lg text-neutral-400">
            Intelligently match candidate resumes with job descriptions.
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <form onSubmit={handleMatch} className="flex flex-col gap-6">
            
            {/* Resume Input Toggle */}
            <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 self-start">
              <button
                type="button"
                onClick={() => setInputType("file")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  inputType === "file" ? "bg-blue-600 text-white shadow-lg" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Upload PDF
              </button>
              <button
                type="button"
                onClick={() => setInputType("text")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  inputType === "text" ? "bg-blue-600 text-white shadow-lg" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Paste Text
              </button>
            </div>

            {/* Resume Input Area */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Candidate Resume {inputType === "file" ? "(PDF)" : "(Text)"}
              </label>
              
              {inputType === "file" ? (
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-700 border-dashed rounded-xl hover:border-blue-500 hover:bg-neutral-800/50 transition-colors relative">
                  <div className="space-y-2 text-center">
                    <UploadCloud className="mx-auto h-10 w-10 text-neutral-400" />
                    <div className="flex text-sm text-neutral-400 justify-center">
                      <label className="relative cursor-pointer rounded-md font-medium text-blue-400 hover:text-blue-300 focus-within:outline-none">
                        <span>Upload a file</span>
                        <input name="resume" type="file" accept=".pdf" className="sr-only" onChange={handleFileChange} />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-neutral-500">PDF up to 10MB</p>
                  </div>
                  {resume && (
                    <div className="absolute inset-0 bg-neutral-900 rounded-xl flex items-center justify-center border-2 border-blue-500">
                      <div className="flex items-center gap-2 text-blue-400 font-medium">
                        <CheckCircle className="w-5 h-5" />
                        {resume.name}
                      </div>
                      <button
                        type="button"
                        onClick={handleClearResume}
                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
                        title="Remove resume"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <textarea
                    rows={8}
                    className="block w-full rounded-xl border-neutral-700 bg-neutral-950 text-neutral-100 placeholder-neutral-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-4 outline-none transition-shadow"
                    placeholder="Paste the candidate's professional summary, experience, and skills here..."
                    value={pastedResume}
                    onChange={(e) => setPastedResume(e.target.value)}
                  />
                  {pastedResume && (
                    <button
                      type="button"
                      onClick={handleClearResume}
                      className="absolute top-2 right-2 p-1 rounded-full bg-neutral-900/50 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Job Description */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Job Description</label>
              <textarea
                rows={5}
                className="block w-full rounded-xl border-neutral-700 bg-neutral-950 text-neutral-100 placeholder-neutral-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-4 outline-none transition-shadow"
                placeholder="Paste the job description here..."
                value={jd}
                onChange={(e) => setJd(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-neutral-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="animate-pulse">Firing up AI Engines & Analyzing...</span>
                </div>
              ) : "Analyze Match"}
            </button>
          </form>
        </div>

        {/* Results Section */}
        {result && (
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-2xl p-6 sm:p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-400" />
              Analysis Result
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                  {result.score}% Match
                </p>
                <p className="text-neutral-400 mt-2 text-lg">{result.message}</p>
              </div>
              
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-neutral-700"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className={result.score > 70 ? "text-green-500" : result.score > 40 ? "text-yellow-500" : "text-red-500"}
                    strokeDasharray={`${result.score}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-xl font-bold text-white">{result.score}</span>
                </div>
              </div>
            </div>

            {/* AI Revise Button */}
            {!improvedResume && (
              <div className="mt-8 pt-6 border-t border-neutral-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-neutral-400">
                  <span className="block font-medium text-neutral-300 mb-1">Want a higher score?</span>
                  Our AI can rewrite your resume to hit 96%+ match potential without fabricating facts.
                </div>
                <button
                  type="button"
                  onClick={handleImprove}
                  disabled={improving}
                  className="shrink-0 flex items-center gap-2 py-2 px-5 border border-purple-500/50 rounded-lg shadow-sm font-semibold text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 focus:outline-none transition-all disabled:opacity-50"
                >
                  {improving ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="animate-pulse">{loadingPhrases[loadingTextIndex]}</span>
                    </div>
                  ) : "Auto-Revise Resume"}
                </button>
              </div>
            )}
            
            {/* AI Suggested Resume */}
            {improvedResume && (
              <div className="mt-8 pt-6 border-t border-neutral-700 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                    AI Optimized Resume (98% Potential)
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(improvedResume);
                      toast.success("Text copied!");
                    }}
                    className="text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-2 px-4 rounded-md transition-colors"
                  >
                    Copy Text
                  </button>
                </div>
                <div className="bg-neutral-950 rounded-xl p-6 overflow-auto max-h-[500px] border border-neutral-800 text-sm text-neutral-300 whitespace-pre-wrap font-mono leading-relaxed shadow-inner">
                  {improvedResume}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-3xl mt-auto pt-12 pb-8 text-center border-t border-neutral-900">
        <p className="text-sm text-neutral-500 font-medium tracking-wide">
          Made by <span className="text-pink-400/80">Prakul Patel</span>
        </p>
        <p className="text-[10px] text-neutral-600 mt-1 uppercase tracking-widest">
          Copyright © 2026 Fitly
        </p>
      </footer>
    </div>
  );
}
