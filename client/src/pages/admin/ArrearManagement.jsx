import React, { useState, useEffect } from "react";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  Trash2,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const ArrearManagement = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [arrears, setArrears] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchArrears();
  }, []);

  const fetchArrears = async () => {
    try {
      setFetching(true);
      const res = await api.get("/admin/arrears");
      setArrears(res.data);
    } catch (err) {
      console.error("Failed to load arrears:", err);
      toast.error("Could not load existing arrears");
    } finally {
      setFetching(false);
    }
  };

  const handleDeleteArrear = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this arrear record? This will also delete all associated attempts.",
      )
    ) {
      return;
    }

    try {
      toast.loading("Deleting record...", { id: "delete-arrear" });
      await api.delete(`/admin/arrears/${id}`);
      toast.success("Record removed successfully", { id: "delete-arrear" });
      fetchArrears(); // Refresh list
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.response?.data?.message || "Failed to delete record", {
        id: "delete-arrear",
      });
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadResult(null); // Reset results
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setUploadResult(null);
    }
  };

  const handleCancelFile = () => {
    setFile(null);
    setUploadResult(null);
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Arrear Students");

    worksheet.columns = [
      { header: "RegisterNumber", key: "regNo", width: 20 },
      { header: "SubjectCode", key: "subjectCode", width: 15 },
      { header: "Semester", key: "semester", width: 12 },
      { header: "InternalMarks", key: "internalMarks", width: 15 },
      { header: "CurrentAttemptSemester", key: "currentSem", width: 25 },
    ];

    // Add instructions row
    worksheet.addRow({
      regNo: "A123456789",
      subjectCode: "CS3401",
      semester: "4",
      internalMarks: "45",
      currentSem: "6",
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "Arrear_Upload_Template.xlsx");
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    toast.loading("Uploading configurations...", { id: "upload-arrear" });

    try {
      const response = await api.post("/admin/arrears/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success(response.data.message || "Upload successful", {
        id: "upload-arrear",
      });
      setUploadResult({
        success: true,
        message: response.data.message,
        errors: response.data.errors,
      });
      fetchArrears(); // Refresh table
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to upload arrear records";
      toast.error(errorMessage, { id: "upload-arrear" });

      // If the backend sent back specific line errors even on a 400/500 let's show them
      setUploadResult({
        success: false,
        message: errorMessage,
        errors: error.response?.data?.errors || [],
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSyncArrears = async () => {
    const sem = window.prompt("Enter the current semester to sync arrears from (e.g., 4):");
    if (!sem) return;
    
    try {
      setFetching(true);
      toast.loading("Syncing arrears from results...", { id: "sync-arrears" });
      const res = await api.post("/admin/arrears/auto-generate", { semester: sem });
      toast.success(res.data.message || "Sync complete", { id: "sync-arrears" });
      fetchArrears();
    } catch (err) {
      console.error("Sync error:", err);
      toast.error(err.response?.data?.message || "Failed to sync arrears", { id: "sync-arrears" });
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="p-8 pb-24">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-[#003B73]">
            Arrear Management
          </h1>
          <p className="text-gray-500 font-medium tracking-wide">
            Manage historical arrear records and import them into the current
            exam session.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={downloadTemplate}
            className="bg-white text-[#003B73] border-2 border-[#003B73] px-6 py-3 rounded-2xl flex items-center gap-2 font-black tracking-wider shadow-sm hover:bg-blue-50 transition-all"
          >
            <FileSpreadsheet size={20} /> TEMPLATE
          </button>
          <button
            onClick={handleSyncArrears}
            className="bg-[#003B73] text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black tracking-wider shadow-lg hover:bg-[#002850] transition-all"
          >
            <RefreshCw size={20} className={fetching ? "animate-spin" : ""} /> REFRESH FROM RESULTS
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 mb-8 flex items-center gap-4 animate-slideIn">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-50">
          <AlertCircle size={24} />
        </div>
        <div>
          <p className="font-black text-[#003B73]">Automatic Generation Active</p>
          <p className="text-sm text-blue-700 font-bold opacity-80">Students with failing grades are now automatically added to this section when marks are calculated or published.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Section */}
        <div
          className="lg:col-span-1 border-2 border-dashed border-gray-300 rounded-3xl p-8 bg-gray-50 flex flex-col items-center justify-center text-center relative"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {!file ? (
            <>
              <div className="w-20 h-20 bg-blue-100 text-[#003B73] rounded-full flex items-center justify-center mb-6">
                <Upload size={40} />
              </div>
              <h3 className="text-xl font-bold text-[#003B73] mb-2">
                Drag & Drop Excel
              </h3>
              <p className="text-gray-500 font-medium mb-6">
                or click below to browse files
              </p>
              <label className="bg-[#003B73] text-white px-8 py-3 rounded-xl font-bold cursor-pointer hover:bg-[#002850] transition-colors shadow-lg">
                BROWSE FILE
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                />
              </label>
              <div className="mt-8 text-sm text-gray-400 font-medium">
                <p>Format: .xlsx, .xls</p>
                <p>
                  Fields: RegisterNumber, SubjectCode, Semester, InternalMarks,
                  CurrentAttemptSemester
                </p>
              </div>
            </>
          ) : (
            <div className="w-full">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800 truncate max-w-[150px]">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancelFile}
                  className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <button
                onClick={handleUpload}
                disabled={loading}
                className="w-full mt-6 bg-[#003B73] text-white py-4 rounded-xl font-black tracking-wider shadow-lg hover:bg-[#002850] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "UPLOADING..." : "CONFIRM UPLOAD"}
              </button>
            </div>
          )}
        </div>

        {/* Info / Result Section */}
        <div className="lg:col-span-2">
          {uploadResult ? (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 h-full">
              <div className="flex items-center gap-3 mb-6">
                {uploadResult.success ? (
                  <CheckCircle2 size={32} className="text-green-500" />
                ) : (
                  <AlertCircle size={32} className="text-red-500" />
                )}
                <h2 className="text-2xl font-black text-gray-800">
                  {uploadResult.success ? "Upload Complete" : "Upload Failed"}
                </h2>
              </div>

              <p className="text-lg text-gray-600 font-medium mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                {uploadResult.message}
              </p>

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertCircle size={20} className="text-red-500" />
                    Warnings & Errors ({uploadResult.errors.length})
                  </h3>
                  <div className="bg-red-50 rounded-xl p-4 max-h-[400px] overflow-y-auto">
                    <ul className="space-y-2">
                      {uploadResult.errors.map((err, i) => (
                        <li
                          key={i}
                          className="text-red-700 font-medium text-sm flex items-start gap-2"
                        >
                          <span className="font-black mt-0.5">•</span> {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 h-full flex flex-col justify-center">
              <h2 className="text-2xl font-black text-[#003B73] mb-6">
                Instructions
              </h2>
              <ul className="space-y-4 font-medium text-gray-600">
                <li className="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-blue-100 text-[#003B73] rounded-lg flex items-center justify-center font-black shrink-0">
                    1
                  </div>
                  <p>
                    Download the standard template by clicking the{" "}
                    <strong className="text-gray-800">TEMPLATE</strong> button.
                  </p>
                </li>
                <li className="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-blue-100 text-[#003B73] rounded-lg flex items-center justify-center font-black shrink-0">
                    2
                  </div>
                  <p>
                    Fill in the Register Numbers and the corresponding Subject
                    Codes of the failed subjects.
                  </p>
                </li>
                <li className="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-blue-100 text-[#003B73] rounded-lg flex items-center justify-center font-black shrink-0">
                    3
                  </div>
                  <div>
                    <p>
                      Important:{" "}
                      <strong className="text-gray-800">Semester</strong> is the
                      original semester of the subject (e.g., 4).{" "}
                      <strong className="text-gray-800">
                        CurrentAttemptSemester
                      </strong>{" "}
                      is the semester the student is currently writing it in
                      (e.g., 6).
                    </p>
                  </div>
                </li>
                <li className="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-blue-100 text-[#003B73] rounded-lg flex items-center justify-center font-black shrink-0">
                    4
                  </div>
                  <p>
                    Internal marks are optional, but recommended to ensure
                    automatic carry-over evaluation.
                  </p>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Existing Arrears Table */}
      <div className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-[#003B73] mb-6 border-b pb-4">
          Currently Registered Arrears
        </h2>

        {fetching ? (
          <div className="text-center py-10 font-bold text-gray-500">
            Loading records...
          </div>
        ) : arrears.length === 0 ? (
          <div className="text-center py-10 font-medium text-gray-500 bg-gray-50 rounded-2xl border-2 border-dashed">
            No arrear records found. Start by uploading an Excel sheet above.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#003B73] text-white">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider">Reg No</th>
                  <th className="px-6 py-4 font-bold tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-4 font-bold tracking-wider">
                    Subject Code
                  </th>
                  <th className="px-6 py-4 font-bold tracking-wider">
                    Orig. Sem
                  </th>
                  <th className="px-6 py-4 font-bold tracking-wider">
                    Current Attempt
                  </th>
                  <th className="px-6 py-4 font-bold tracking-wider text-center">
                    Attempts
                  </th>
                  <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {arrears.map((a, i) => (
                  <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 font-black text-gray-800">
                      {a.student?.registerNumber || a.student?.rollNo || "N/A"}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-600 truncate max-w-[200px]">
                      {a.student?.name || "Unknown"}
                    </td>
                    <td className="px-6 py-4 font-bold text-[#003B73]">
                      {a.subject?.code || "N/A"}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-600">
                      {a.semester}
                    </td>
                    <td className="px-6 py-4 font-bold text-indigo-600">
                      {a.attempts
                        ?.filter((att) => !att.resultStatus)
                        .map((att) => att.semester)
                        .join(", ") || "-"}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-gray-700">
                      {a.attemptCount}
                    </td>
                    <td className="px-6 py-4">
                      {a.isCleared ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg font-bold text-xs">
                          Cleared
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg font-bold text-xs">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteArrear(a.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove Record"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArrearManagement;
