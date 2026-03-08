import CustomSelect from "../../components/CustomSelect";
import React, { useState, useEffect, useCallback } from "react";
import {
  Award,
  Filter,
  RefreshCw,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Search,
  Printer
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const ExamControlCenter = () => {
  const [filters, setFilters] = useState({
    department: "",
    semester: "",
    regulation: "2021",
  });

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultsData, setResultsData] = useState(null);

  const fetchInitialData = async () => {
    try {
      const deptsRes = await api.get("/admin/departments");
      setDepartments(deptsRes.data);
      if (deptsRes.data.length > 0) {
        setFilters((prev) => ({ ...prev, department: deptsRes.data[0].name }));
      }
    } catch (error) {
      toast.error("Failed to load departments");
    }
  };

  const fetchResults = async () => {
    if (!filters.department || !filters.semester) {
      toast.error("Please select Department and Semester");
      return;
    }

    setLoading(true);
    try {
      const res = await api.get("/exam/consolidated-results", {
        params: filters,
      });
      setResultsData(res.data);
      toast.success("Results loaded successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch results");
      setResultsData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateGPAs = async () => {
    if (!filters.department || !filters.semester) {
      toast.error("Please select criteria first");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Processing GPA calculations...");
    try {
      await api.post("/exam/calculate-bulk-gpa", filters);
      toast.success("GPAs calculated successfully", { id: toastId });
      // Refresh results to show new GPA values
      fetchResults();
    } catch (error) {
      console.error(error);
      toast.error("Failed to calculate GPAs", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleExport = async (type) => {
    if (!resultsData) return;

    const endpoint = type === 'A4 Portrait' ? 'export-portrait' : 'export-landscape';
    const toastId = toast.loading(`Preparing ${type} export...`);

    try {
      const response = await api.get(`/exam/${endpoint}`, {
        params: filters,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `results_${type.replace(/\s+/g, '_').toLowerCase()}_${new Date().getTime()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${type} exported successfully`, { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error(`Failed to export ${type}`, { id: toastId });
    }
  };

  return (
    <div className="w-full animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black text-[#003B73] tracking-tight flex items-center gap-3">
            <Award className="text-blue-600" size={32} /> Provisional Results
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Consolidated visualization and management of semester examinations.
          </p>
        </div>

        {resultsData && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExport('A4 Portrait')}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-[#003B73] rounded-2xl font-bold hover:shadow-lg transition-all"
            >
              <FileText size={18} /> A4 Portrait
            </button>
            <button
              onClick={() => handleExport('A3 Landscape')}
              className="flex items-center gap-2 px-6 py-3 bg-[#003B73] text-white rounded-2xl font-bold hover:bg-blue-800 shadow-xl shadow-blue-900/10 transition-all"
            >
              <Printer size={18} /> A3 Landscape (T-Sheet)
            </button>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[32px] shadow-sm border border-white/40 mb-8 flex flex-wrap items-end gap-6">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
            Department
          </label>
          <CustomSelect
            className="w-full"
            value={filters.department}
            onChange={(e) =>
              setFilters({ ...filters, department: e.target.value })
            }
          >
            <option value="">Select Department...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.code || d.name}>
                {d.code || d.name}
              </option>
            ))}
          </CustomSelect>
        </div>

        <div className="w-48">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
            Semester
          </label>
          <CustomSelect
            className="w-full"
            value={filters.semester}
            onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
          >
            <option value="">Choose...</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </CustomSelect>
        </div>

        <div className="w-48">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
            Regulation
          </label>
          <CustomSelect
            className="w-full"
            value={filters.regulation}
            onChange={(e) => setFilters({ ...filters, regulation: e.target.value })}
          >
            <option value="2021">2021 Regulation</option>
            <option value="2023">2023 Regulation</option>
          </CustomSelect>
        </div>

        <button
          onClick={fetchResults}
          disabled={loading || !filters.department || !filters.semester}
          className="bg-white border-2 border-[#003B73] text-[#003B73] h-[52px] px-8 rounded-2xl hover:bg-blue-50 disabled:bg-gray-100 disabled:text-gray-400 transition-all font-black flex items-center gap-2"
        >
          {loading ? <RefreshCw className="animate-spin" size={20} /> : <Search size={20} />}
          Fetch Results
        </button>

        <button
          onClick={handleCalculateGPAs}
          disabled={loading || !filters.department || !filters.semester}
          className="bg-[#003B73] text-white h-[52px] px-8 rounded-2xl hover:bg-blue-800 disabled:bg-gray-100 disabled:text-gray-400 transition-all font-black flex items-center gap-2 shadow-lg shadow-blue-900/20"
        >
          {loading ? <RefreshCw className="animate-spin" size={20} /> : <Award size={20} />}
          Process GPAs
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="font-black text-gray-400 uppercase tracking-widest animate-pulse">
            Processing Academic Records...
          </p>
        </div>
      ) : !resultsData ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[48px] py-24 flex flex-col items-center text-center px-8">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
            <Filter size={32} className="text-gray-200" />
          </div>
          <h3 className="text-2xl font-black text-gray-300 mb-2">Ready to Visualize</h3>
          <p className="text-gray-400 font-medium max-w-sm">
            Select the academic criteria above to generate the consolidated result matrix.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden animate-slideUp">
          <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-[#003B73]">Result Matrix</h2>
              <p className="text-sm font-medium text-gray-400">Total {resultsData.students.length} students processed</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl text-emerald-700 font-bold text-xs border border-emerald-100">
                <CheckCircle size={14} /> Pass
              </div>
              <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-xl text-red-700 font-bold text-xs border border-red-100">
                <XCircle size={14} /> Arrear
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white">
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">S.No</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 sticky left-0 bg-white z-10">Register No</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Student Name</th>
                  {resultsData.subjects.map(sub => (
                    <th key={sub.code} className="px-6 py-5 text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-gray-50 text-center min-w-[100px]">
                      {sub.code}
                      <span className="block text-[8px] text-gray-400 mt-1 lowercase font-normal italic">{sub.credits} credits</span>
                    </th>
                  ))}
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-center">GPA</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-center">CGPA</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {resultsData.students.map((student) => (
                  <tr key={student.registerNumber} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-6 font-bold text-gray-400 text-sm">{student.sno}</td>
                    <td className="px-6 py-6 font-black text-[#003B73] text-sm sticky left-0 bg-white group-hover:bg-blue-50/30 transition-colors z-10 border-r border-gray-50">
                      {student.registerNumber}
                    </td>
                    <td className="px-6 py-6 font-bold text-gray-700 text-sm">{student.name}</td>
                    {resultsData.subjects.map(sub => {
                      const m = student.marks[sub.code];
                      const isFail = m?.status === 'FAIL';
                      const isAbsent = m?.grade === 'AB';
                      return (
                        <td key={sub.code} className="px-6 py-6 text-center">
                          <span className={`inline-flex flex-col items-center justify-center p-2 rounded-xl min-w-[50px] ${isAbsent ? 'bg-gray-100 text-gray-400' :
                            isFail ? 'bg-red-50 text-red-600' :
                              'bg-blue-50 text-blue-600'
                            }`}>
                            <span className="text-xs font-black">{m?.grade || '-'}</span>
                            {/* <span className="text-[9px] opacity-70 mt-0.5">{m?.total}</span> */}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-6 py-6 text-center">
                      <span className="text-sm font-black text-gray-700">{student.gpa?.toFixed(2) || '0.00'}</span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className="text-sm font-black text-gray-700">{student.cgpa?.toFixed(2) || '0.00'}</span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${student.resultStatus === 'PASS'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        {student.resultStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 p-6 flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
            <span>MIET Exam Cell Management System</span>
            <div className="flex gap-6">
              <span>Verified: <CheckCircle size={14} className="inline ml-1 text-emerald-500" /></span>
              <span>System Gen: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamControlCenter;
