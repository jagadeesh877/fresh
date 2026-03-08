import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import {
  ClipboardList,
  Send,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  FlaskConical,
  BookOpen,
  Download,
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const ExternalMarkEntry = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  // For INTEGRATED subjects we fetch one component at a time
  const [activeComponent, setActiveComponent] = useState("THEORY"); // "THEORY" | "LAB"
  const [dataByComponent, setDataByComponent] = useState({ THEORY: null, LAB: null });
  const [marksByComponent, setMarksByComponent] = useState({ THEORY: {}, LAB: {} });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // PDF metadata inputs
  const [pdfMeta, setPdfMeta] = useState({ dateSession: "", qpCode: "", packetNo: "1" });
  const [showPdfModal, setShowPdfModal] = useState(false);

  useEffect(() => {
    fetchMarks();
  }, [assignmentId]);

  const fetchMarks = async (component) => {
    setLoading(true);
    try {
      const params = {};
      if (component) params.component = component;

      const res = await api.get(`/external/marks/assignment/${assignmentId}`, { params });
      const d = res.data;

      // Use the component from response (or the one we asked for, or default)
      const targetComponent = d.component || component || "THEORY";

      if (d.subjectCategory === "INTEGRATED") {
        setActiveComponent(targetComponent);
      }

      setDataByComponent((prev) => ({ ...prev, [targetComponent]: d }));

      // Restore marks if already loaded
      const initialMarks = {};
      d.dummyList.forEach((item) => {
        if (item.mark !== null && item.mark !== undefined)
          initialMarks[item.dummyNumber] = item.mark;
      });
      setMarksByComponent((prev) => ({ ...prev, [targetComponent]: initialMarks }));
    } catch (err) {
      toast.error("Failed to load marks list");
    } finally {
      setLoading(false);
    }
  };

  const handleTabSwitch = (component) => {
    setActiveComponent(component);
    if (!dataByComponent[component]) {
      fetchMarks(component);
    }
  };

  const handleMarkChange = (dummyNumber, value) => {
    if (value === "") {
      setMarksByComponent(prev => ({
        ...prev,
        [activeComponent]: { ...prev[activeComponent], [dummyNumber]: value }
      }));
      return;
    }
    const intVal = parseInt(value, 10);
    // All categories now accept /100
    if (!isNaN(intVal) && intVal >= 0 && intVal <= 100) {
      setMarksByComponent(prev => ({
        ...prev,
        [activeComponent]: { ...prev[activeComponent], [dummyNumber]: intVal }
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const data = dataByComponent[activeComponent];
    if (!data) return;

    try {
      const marksArray = Object.entries(marksByComponent[activeComponent]).map(
        ([dummyNumber, rawMark]) => ({ dummyNumber, rawMark: parseInt(rawMark, 10) })
      );

      const payload = {
        subjectId: data.subjectId,
        marks: marksArray,
      };

      // For INTEGRATED: send which component we're submitting
      if (data.subjectCategory === "INTEGRATED") {
        payload.component = activeComponent;
      }

      await api.post("/external/marks/submit", payload);
      toast.success(`${activeComponent === "LAB" ? "Lab" : "Theory"} marks submitted successfully`);
      setShowPdfModal(true); // Prompt PDF download
    } catch (err) {
      toast.error("Failed to submit marks");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    const data = dataByComponent[activeComponent];
    if (!data) return;
    try {
      const params = {
        subjectId: data.subjectId,
        dateSession: pdfMeta.dateSession,
        qpCode: pdfMeta.qpCode,
        packetNo: pdfMeta.packetNo,
      };
      if (data.subjectCategory === "INTEGRATED") {
        params.component = activeComponent;
      }
      const response = await api.get("/external/marks/statement-pdf", {
        params,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const compLabel = data.subjectCategory === "INTEGRATED" ? `_${activeComponent}` : "";
      link.setAttribute("download", `Statement_${data.subjectCode || data.subjectId}${compLabel}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setShowPdfModal(false);
      toast.success("PDF downloaded");
    } catch (pdfErr) {
      toast.error("PDF generation failed");
    }
  };

  if (loading && !dataByComponent.THEORY)
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003B73]"></div>
      </div>
    );

  const data = dataByComponent[activeComponent] || dataByComponent.THEORY;
  if (!data) return null;

  const category = data?.subjectCategory || "THEORY";
  const isIntegrated = category === "INTEGRATED";
  const currentData = dataByComponent[activeComponent] || data;
  const currentMarks = marksByComponent[activeComponent] || {};

  // For the current component view:
  const isLABView = (category === "LAB") || (isIntegrated && activeComponent === "LAB");
  const maxMark = 100; // All categories now enter /100
  const convertedNote = category === "LAB"
    ? "Converted to /40"
    : isIntegrated
      ? `Converted to /25 (${activeComponent})`
      : "Converted to /60";

  const cardBg = isLABView ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200";
  const bannerIcon = isLABView
    ? <Eye className="text-green-600 mt-1 shrink-0" size={24} />
    : <EyeOff className="text-blue-600 mt-1 shrink-0" size={24} />;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="EXTERNAL_STAFF" />
      <div className="flex-1 flex flex-col ml-64 transition-all duration-300">
        <Header title="Enter External Marks" />
        <main className="flex-1 p-10 mt-24 overflow-y-auto animate-fadeIn">
          <button
            onClick={() => navigate("/external")}
            className="flex items-center gap-2 text-gray-400 hover:text-[#003B73] font-bold mb-8 transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>

          <div className="bg-white rounded-[32px] shadow-xl shadow-blue-900/5 overflow-hidden border border-gray-100 mb-10">
            {/* Header */}
            <div className="p-10 bg-[#003B73] text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-blue-200 text-xs font-black uppercase tracking-[0.2em] mb-3">
                    Assessment Entry
                  </p>
                  <h1 className="text-4xl font-black tracking-tight">{data.subject}</h1>
                  <div className="mt-4 flex items-center gap-4 flex-wrap">
                    <span className="bg-white/10 px-4 py-1.5 rounded-full text-sm font-bold border border-white/20 uppercase">
                      {data.subjectCode || data.subject}
                    </span>
                    <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${category === "LAB" ? "bg-green-100 text-green-700"
                      : category === "INTEGRATED" ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                      }`}>
                      {category}
                    </span>
                  </div>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-md text-center min-w-[140px]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1">
                    Deadline
                  </p>
                  <p className="text-xl font-black">
                    {data.deadline ? new Date(data.deadline).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-10">
              {/* INTEGRATED: Component Tabs Removed (Locked to assigned task) */}

              <div className={`border rounded-2xl p-6 mb-10 flex items-start gap-4 ${cardBg}`}>
                {bannerIcon}
                <div>
                  <p className={`font-black text-lg ${isLABView ? "text-green-800" : "text-[#003B73]"}`}>
                    {isLABView ? "Register Numbers Visible" : "Identity Masking Active"}
                  </p>
                  <p className={`font-medium text-sm ${isLABView ? "text-green-700/80" : "text-blue-700/70"}`}>
                    {isLABView
                      ? "Enter lab external marks out of 100."
                      : "Dummy numbers are shown. Enter theory external marks out of 100."}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003B73]"></div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="border border-gray-200 rounded-2xl overflow-hidden mb-6">
                    <table className="w-full text-center border-collapse bg-white">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs font-black text-gray-500 uppercase tracking-widest">
                          <th className="p-4 border-r border-gray-200 w-20">Sl.No</th>
                          <th className="p-4 border-r border-gray-200">
                            {isLABView ? "Register Number" : "Dummy Number"}
                          </th>
                          {isLABView && (
                            <th className="p-4 border-r border-gray-200">Name</th>
                          )}
                          <th className="p-4">Marks (out of 100)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(currentData?.dummyList || []).map((item, idx) => {
                          const rawVal = currentMarks[item.dummyNumber];
                          const converted = rawVal !== "" && rawVal !== undefined
                            ? category === "LAB"
                              ? Math.round((rawVal / 100) * 40)
                              : isIntegrated
                                ? Math.round((rawVal / 100) * 25)
                                : Math.round((rawVal / 100) * 60)
                            : null;

                          return (
                            <tr key={item.dummyNumber} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                              <td className="p-4 border-r border-gray-100 font-bold text-gray-600">{idx + 1}</td>
                              <td className="p-4 border-r border-gray-100 font-black text-[#003B73] text-lg">
                                {isLABView ? item.registerNumber || item.dummyNumber : item.dummyNumber}
                              </td>
                              {isLABView && (
                                <td className="p-4 border-r border-gray-100 font-medium text-gray-600 text-sm">
                                  {item.name}
                                </td>
                              )}
                              <td className="p-4 border-r border-gray-100 relative">
                                <div className="flex items-center justify-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    placeholder="0"
                                    className="w-24 p-2 bg-gray-50 rounded-xl border-2 border-transparent focus:border-blue-600 outline-none font-black text-center text-lg text-[#003B73] transition-all"
                                    value={currentMarks[item.dummyNumber] ?? ""}
                                    onChange={(e) => handleMarkChange(item.dummyNumber, e.target.value)}
                                    required
                                  />
                                  <span className="font-bold text-gray-400">/ 100</span>
                                  {rawVal !== undefined && rawVal !== "" && (
                                    <CheckCircle2 className="text-green-500" size={18} />
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {(currentData?.dummyList || []).length === 0 && (
                          <tr>
                            <td colSpan={isLABView ? 5 : 4} className="p-10 text-gray-400 font-bold">
                              No students available for this subject.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-8 border-t border-gray-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`px-10 py-5 rounded-[24px] font-black flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] text-lg ${submitting ? "bg-gray-400 cursor-not-allowed text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                    >
                      {submitting ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      ) : (
                        <Send size={24} />
                      )}
                      {submitting ? "Submitting..." : `Submit ${isIntegrated ? (activeComponent === "LAB" ? "Lab" : "Theory") + " " : ""}Marks`}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* PDF Download Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full mx-4">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-2">Marks Submitted!</h2>
              <p className="text-gray-500 text-sm">Enter the exam details to download the Statement of Marks PDF.</p>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                  Date &amp; Session (e.g. 09/01/2026 &amp; FN)
                </label>
                <input
                  type="text"
                  placeholder="09/01/2026 & FN"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold focus:border-blue-600 outline-none"
                  value={pdfMeta.dateSession}
                  onChange={e => setPdfMeta(p => ({ ...p, dateSession: e.target.value }))}
                />
              </div>
              {!isLABView && (
                <>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                      Question Paper Code
                    </label>
                    <input
                      type="text"
                      placeholder="N54702"
                      className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold focus:border-blue-600 outline-none"
                      value={pdfMeta.qpCode}
                      onChange={e => setPdfMeta(p => ({ ...p, qpCode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                      Starting Packet No
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold focus:border-blue-600 outline-none"
                      value={pdfMeta.packetNo}
                      onChange={e => setPdfMeta(p => ({ ...p, packetNo: e.target.value }))}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowPdfModal(false)}
                className="flex-1 py-4 rounded-2xl font-black text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
              >
                Skip
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex-1 py-4 rounded-2xl font-black text-white bg-[#003B73] hover:bg-blue-900 flex items-center justify-center gap-2 transition shadow-lg"
              >
                <Download size={20} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalMarkEntry;
