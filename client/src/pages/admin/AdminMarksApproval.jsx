import CustomSelect from "../../components/CustomSelect";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import {
  CheckCircle,
  Lock,
  Clock,
  Filter,
  Users,
  BookOpen,
  Unlock,
  RotateCcw,
  ChevronLeft
} from "lucide-react";

const AdminMarksApproval = () => {
  const navigate = useNavigate();
  const [selectedExam, setSelectedExam] = useState("cia1"); // 'cia1', 'cia2', 'cia3'
  const [allSubjects, setAllSubjects] = useState([]);
  const [departments, setDepartments] = useState([]); // Fetch departments for filter
  const [filterDept, setFilterDept] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [viewMode, setViewMode] = useState("selection"); // 'selection', 'grid'
  const [selectedCategory, setSelectedCategory] = useState(null); // 'THEORY', 'LAB'
  const [filterStatus, setFilterStatus] = useState("ALL"); // 'ALL', 'PENDING', 'COMPLETED'

  // Detailed View State
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectMarks, setSubjectMarks] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  useEffect(() => {
    fetchSubjectsStatus();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await api.get("/admin/departments");
      setDepartments(res.data);
    } catch (err) {
      console.error("Failed to fetch departments");
    }
  };

  const fetchSubjectsStatus = async () => {
    console.log("Fetching subjects status...");
    try {
      const res = await api.get("/admin/marks-approval/status");
      console.log("Subjects status response:", res.data);
      setAllSubjects(res.data);
    } catch (error) {
      console.error("Error fetching subjects status:", error);
    }
  };

  const fetchSubjectMarks = async (subjectId) => {
    try {
      const res = await api.get(`/admin/marks-approval/${subjectId}`);
      setSubjectMarks(res.data);
      setSelectedStudents([]); // Reset selection
    } catch (error) {
      console.error("Error fetching marks:", error);
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setViewMode("grid");
    if (category === 'LAB') {
      setSelectedExam('lab_marks');
    } else {
      setSelectedExam('cia1');
    }
  };

  const handleSubjectClick = (subject) => {
    setSelectedSubject(subject);
    fetchSubjectMarks(subject.subjectId);
    setSelectedStudents([]);

    // Decisive contextual exam selection based on which card was clicked
    if (selectedCategory === 'LAB') {
      setSelectedExam(subject.subjectCategory === 'INTEGRATED' ? 'integrated_lab' : 'lab_marks');
    } else if (selectedCategory === 'INTEGRATED') {
      setSelectedExam('cia1'); // Default to CIA for Integrated, but user can switch to lab_marks
    } else {
      setSelectedExam('cia1');
    }
  };

  const handleBack = () => {
    setSelectedSubject(null);
    setSubjectMarks([]);
    fetchSubjectsStatus(); // Refresh counts
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((prev) => {
      if (prev.includes(studentId))
        return prev.filter((id) => id !== studentId);
      return [...prev, studentId];
    });
  };

  const handleSelectAll = () => {
    if (
      selectedStudents.length > 0 &&
      selectedStudents.length === subjectMarks.length
    ) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(subjectMarks.map((s) => s.student.id)); // Use student.id from Mark object
    }
  };

  const handleApproveSelected = async (lock = false) => {
    if (selectedStudents.length === 0) return;

    const action = lock ? "Approve & Lock" : "Approve";
    if (
      !confirm(
        `${action} ${selectedStudents.length} students for ${selectedExam.toUpperCase()}?`,
      )
    )
      return;

    try {
      await api.post("/admin/marks-approval/approve", {
        subjectId: selectedSubject.subjectId,
        studentIds: selectedStudents,
        lock,
        exam: selectedExam,
      });
      alert(`Success: ${action} completed for ${selectedExam.toUpperCase()}`);
      fetchSubjectMarks(selectedSubject.subjectId);
    } catch (error) {
      alert("Error approving marks");
    }
  };

  const handleUnlockSelected = async () => {
    if (selectedStudents.length === 0) return;
    if (
      !confirm(
        `Unlock ${selectedExam.toUpperCase()} marks for selected students? This allows faculty to edit them again.`,
      )
    )
      return;

    try {
      await api.post("/admin/marks-approval/unlock", {
        subjectId: selectedSubject.subjectId,
        studentIds: selectedStudents,
        exam: selectedExam,
      });
      alert(`Unlocked ${selectedExam.toUpperCase()} marks`);
      fetchSubjectMarks(selectedSubject.subjectId);
    } catch (error) {
      alert("Error unlocking marks");
    }
  };

  const handleUnapproveSelected = async () => {
    if (selectedStudents.length === 0) return;
    if (
      !confirm(
        `Revert approval for ${selectedExam.toUpperCase()}? These marks will become PENDING again.`,
      )
    )
      return;

    try {
      await api.post("/admin/marks-approval/unapprove", {
        subjectId: selectedSubject.subjectId,
        studentIds: selectedStudents,
        exam: selectedExam,
      });
      alert(`Reverted approval for ${selectedExam.toUpperCase()}`);
      fetchSubjectMarks(selectedSubject.subjectId);
    } catch (error) {
      alert("Error reverting approval");
    }
  };

  const calculateCIA = (test, assignment, attendance) => {
    const parse = (v) => (v === -1 || v === null || v === undefined || v === '' ? 0 : parseFloat(v) || 0);
    return parse(test) + parse(assignment) + parse(attendance);
  };

  // Filter Logic
  const filteredSubjects = allSubjects.filter((subject) => {
    if (filterDept) {
      const selectedDeptObj = departments.find(
        (d) => (d.code || d.name) === filterDept,
      );
      if (selectedDeptObj) {
        const names = [selectedDeptObj.name, selectedDeptObj.code].filter(Boolean);
        if (!names.includes(subject.department)) return false;
      } else if (subject.department !== filterDept) {
        return false;
      }
    }
    if (filterSemester && subject.semester !== parseInt(filterSemester))
      return false;

    const category = (subject.subjectCategory || 'THEORY').toUpperCase();

    // Strictly filter by chosen module
    if (selectedCategory === 'THEORY' && category !== 'THEORY') return false;
    if (selectedCategory === 'LAB' && category !== 'LAB') return false;
    if (selectedCategory === 'INTEGRATED' && category !== 'INTEGRATED') return false;

    // Further contextual filtering based on tab selection
    if (selectedCategory === 'INTEGRATED') {
      // Allow switching between CIA and Lab in the detailed view dropdown, but
      // for the grid itself, if we are in 'INTEGRATED' mode and a CIA tab is selected, it's fine.
    } else if (selectedCategory === 'THEORY') {
      if (selectedExam === 'lab_marks' || selectedExam === 'integrated_lab') return false;
    } else if (selectedCategory === 'LAB') {
      if (selectedExam !== 'lab_marks' && selectedExam !== 'internal') return false;
    }

    // Map exam tab → the approval field key used in status counts
    // 'lab_marks' and 'integrated_lab' both use the 'internal' approval field
    const examKey = (selectedExam === 'lab_marks' || selectedExam === 'integrated_lab') ? 'internal' : selectedExam;

    // Filter based on Selected Exam Status
    const pendingCount = subject[`pending_${examKey}`] || 0;
    const approvedCount = subject[`approved_${examKey}`] || 0;
    const lockedCount = subject[`locked_${examKey}`] || 0;

    // Hide subjects with no marks entered yet
    if (pendingCount + approvedCount + lockedCount === 0) return false;

    if (filterStatus === "PENDING") return pendingCount > 0;
    if (filterStatus === "COMPLETED")
      return pendingCount === 0 && (approvedCount > 0 || lockedCount > 0);

    return true;
  });

  if (selectedSubject) {
    return (
      <div className="w-full animate-fadeIn p-4">
        <button
          onClick={handleBack}
          className="mb-8 flex items-center gap-3 text-[#003B73] hover:text-blue-700 font-black text-sm uppercase tracking-widest transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-white shadow-lg shadow-blue-900/5 flex items-center justify-center group-hover:bg-[#003B73] group-hover:text-white transition-all transform group-active:scale-90">
            <ChevronLeft size={20} />
          </div>
          <span>Back to Overview</span>
        </button>

        <div className="bg-white rounded-[40px] shadow-xl shadow-blue-900/5 border border-gray-100 p-10 mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-4 py-1.5 bg-blue-50 text-[#003B73] rounded-xl font-black text-xs uppercase tracking-wider border border-blue-100">
                  {selectedSubject.subjectCode}
                </span>
                <span className="px-4 py-1.5 bg-gray-50 text-gray-500 rounded-xl font-black text-xs uppercase tracking-wider border border-gray-100">
                  Semester {selectedSubject.semester}
                </span>
              </div>
              <h2 className="text-4xl font-black text-[#003B73] tracking-tight mb-2 leading-tight">
                {selectedSubject.subjectName}
              </h2>
              <p className="text-gray-500 font-medium flex items-center gap-2">
                <Users size={18} className="text-blue-400" />
                {selectedSubject.department} • Faculty:{" "}
                <span className="text-[#003B73] font-bold">
                  {selectedSubject.faculty}
                </span>
              </p>
            </div>

            <div className="flex flex-col items-end gap-4">
              <div className="bg-[#003B73] p-6 rounded-[32px] text-white shadow-lg shadow-blue-900/20 flex items-center gap-6 min-w-[300px]">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <BookOpen size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-blue-200 text-xs font-black uppercase tracking-widest mb-1">
                    Active Focus
                  </p>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {selectedCategory !== 'LAB' && (
                      <>
                        <button onClick={() => setSelectedExam('cia1')} className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${selectedExam === 'cia1' ? 'bg-white text-[#003B73] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>CIA 1</button>
                        <button onClick={() => setSelectedExam('cia2')} className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${selectedExam === 'cia2' ? 'bg-white text-[#003B73] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>CIA 2</button>
                        <button onClick={() => setSelectedExam('cia3')} className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${selectedExam === 'cia3' ? 'bg-white text-[#003B73] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>CIA 3</button>
                      </>
                    )}
                    {selectedCategory === 'LAB' && (
                      <button onClick={() => setSelectedExam('lab_marks')} className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${selectedExam === 'lab_marks' ? 'bg-white text-[#003B73] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>Lab Marks</button>
                    )}
                    {selectedCategory === 'INTEGRATED' && (
                      <button onClick={() => setSelectedExam('integrated_lab')} className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${selectedExam === 'integrated_lab' ? 'bg-white text-[#003B73] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>Integrated Lab</button>
                    )}
                    <button onClick={() => setSelectedExam('internal')} className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${selectedExam === 'internal' ? 'bg-emerald-400 text-[#003B73] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>Final Result</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12 pt-10 border-t border-gray-50">
                <button
                  onClick={() => handleApproveSelected(false)}
                  disabled={selectedStudents.length === 0}
                  className="flex items-center justify-center gap-3 px-8 py-5 bg-emerald-600 text-white rounded-[24px] hover:bg-emerald-700 disabled:opacity-30 disabled:translate-y-0 transition-all font-black shadow-lg shadow-emerald-900/20 hover:-translate-y-1"
                >
                  <CheckCircle size={22} />
                  Approve ({selectedStudents.length})
                </button>
                <button
                  onClick={() => handleApproveSelected(true)}
                  disabled={selectedStudents.length === 0}
                  className="flex items-center justify-center gap-3 px-8 py-5 bg-blue-600 text-white rounded-[24px] hover:bg-blue-700 disabled:opacity-30 disabled:translate-y-0 transition-all font-black shadow-lg shadow-blue-900/20 hover:-translate-y-1"
                >
                  <Lock size={22} />
                  Approve & Lock
                </button>
                <button
                  onClick={handleUnlockSelected}
                  disabled={selectedStudents.length === 0}
                  className="flex items-center justify-center gap-3 px-8 py-5 bg-orange-500 text-white rounded-[24px] hover:bg-orange-600 disabled:opacity-30 disabled:translate-y-0 transition-all font-black shadow-lg shadow-orange-900/20 hover:-translate-y-1"
                >
                  <Unlock size={22} />
                  Unlock Entry
                </button>
                <button
                  onClick={handleUnapproveSelected}
                  disabled={selectedStudents.length === 0}
                  className="flex items-center justify-center gap-3 px-8 py-5 bg-red-500 text-white rounded-[24px] hover:bg-red-600 disabled:opacity-30 disabled:translate-y-0 transition-all font-black shadow-lg shadow-red-900/20 hover:-translate-y-1"
                >
                  <RotateCcw size={22} />
                  Revert Approval
                </button>
              </div>
            </div>
          </div>
        </div>

        {subjectMarks.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[40px] border border-dashed border-gray-200">
            <Users size={64} className="mx-auto text-gray-100 mb-6" />
            <p className="text-gray-400 font-black text-xl">
              No student records found
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[40px] shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-8">
                    <input
                      type="checkbox"
                      checked={
                        selectedStudents.length > 0 &&
                        selectedStudents.length === subjectMarks.length
                      }
                      onChange={handleSelectAll}
                      className="w-5 h-5 rounded-lg border-gray-300 text-[#003B73] focus:ring-[#003B73]"
                    />
                  </th>
                  <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest">
                    Roll No
                  </th>
                  <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest">
                    Student Name
                  </th>
                  <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest">
                    Department
                  </th>
                  {selectedExam === "internal" ? (
                    <>
                      {((selectedSubject?.subjectCategory || '').toUpperCase() === "THEORY" || (selectedSubject?.subjectCategory || '').toUpperCase() === "INTEGRATED") && (
                        <>
                          <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest text-center">CIA 1</th>
                          <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest text-center">CIA 2</th>
                          <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest text-center">CIA 3</th>
                        </>
                      )}
                      {((selectedSubject?.subjectCategory || '').toUpperCase() === "LAB" || (selectedSubject?.subjectCategory || '').toUpperCase() === "INTEGRATED") && (
                        <>
                          <th className="p-8 text-xs font-black text-emerald-500 uppercase tracking-widest text-center">Attendance</th>
                          <th className="p-8 text-xs font-black text-emerald-500 uppercase tracking-widest text-center">Observation</th>
                          <th className="p-8 text-xs font-black text-emerald-500 uppercase tracking-widest text-center">Record</th>
                          <th className="p-8 text-xs font-black text-emerald-500 uppercase tracking-widest text-center">Model</th>
                        </>
                      )}
                      <th className="p-8 text-xs font-black text-[#003B73] uppercase tracking-widest text-center">Final Internal</th>
                    </>
                  ) : selectedExam === "lab_marks" || selectedExam === "integrated_lab" ? (
                    <>
                      <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Attendance</th>
                      <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Observation</th>
                      <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Record</th>
                      <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Model</th>
                      <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest text-center">
                        {selectedExam === "integrated_lab" ? "Integrated Lab Total" : "Lab Total"}
                      </th>
                    </>
                  ) : (
                    <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest text-center">
                      {selectedExam.toUpperCase()} Total
                    </th>
                  )}
                  <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subjectMarks.map((mark) => {
                  const cia1Total = calculateCIA(
                    mark.cia1_test,
                    mark.cia1_assignment,
                    mark.cia1_attendance,
                  );
                  const cia2Total = calculateCIA(
                    mark.cia2_test,
                    mark.cia2_assignment,
                    mark.cia2_attendance,
                  );
                  const cia3Total = calculateCIA(
                    mark.cia3_test,
                    mark.cia3_assignment,
                    mark.cia3_attendance,
                  );

                  // lab_marks and integrated_lab approval map to the same isApproved/isLocked fields as 'internal'
                  const examKey = (selectedExam === "lab_marks" || selectedExam === "integrated_lab") ? "internal" : selectedExam;
                  const isLocked = examKey === "internal" ? mark.isLocked : mark[`isLocked_${examKey}`];
                  const isApproved = examKey === "internal" ? mark.isApproved : mark[`isApproved_${examKey}`];

                  return (
                    <tr
                      key={mark.studentId}
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="p-8">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(mark.studentId)}
                          onChange={() =>
                            toggleStudentSelection(mark.studentId)
                          }
                          className="w-5 h-5 rounded-lg border-gray-300 text-[#003B73] focus:ring-[#003B73]"
                        />
                      </td>
                      <td className="p-8 font-mono text-sm uppercase text-[#003B73] font-bold">
                        {mark.student?.rollNo || "N/A"}
                      </td>
                      <td className="p-8">
                        <p className="font-bold text-[#003B73] text-lg">
                          {mark.student?.name || "Unknown Student"}
                        </p>
                      </td>
                      <td className="p-8">
                        <span className="text-gray-500 font-medium">
                          {mark.student?.department || "N/A"} -{" "}
                          <span className="font-black text-[#003B73]">
                            Y{mark.student?.year || "-"}
                          </span>
                        </span>
                      </td>
                      {selectedExam === "internal" ? (
                        <>
                          {((selectedSubject?.subjectCategory || '').toUpperCase() === "THEORY" || (selectedSubject?.subjectCategory || '').toUpperCase() === "INTEGRATED") && (
                            <>
                              <td className="p-8 text-center font-mono font-bold text-gray-400">{cia1Total.toFixed(1)}</td>
                              <td className="p-8 text-center font-mono font-bold text-gray-400">{cia2Total.toFixed(1)}</td>
                              <td className="p-8 text-center font-mono font-bold text-gray-400">{cia3Total.toFixed(1)}</td>
                            </>
                          )}
                          {((selectedSubject?.subjectCategory || '').toUpperCase() === "LAB" || (selectedSubject?.subjectCategory || '').toUpperCase() === "INTEGRATED") && (
                            <>
                              <td className="p-8 text-center font-mono font-bold text-emerald-600">{mark.lab_attendance ?? "-"}</td>
                              <td className="p-8 text-center font-mono font-bold text-emerald-600">{mark.lab_observation ?? "-"}</td>
                              <td className="p-8 text-center font-mono font-bold text-emerald-600">{mark.lab_record ?? "-"}</td>
                              <td className="p-8 text-center font-mono font-bold text-emerald-600">{mark.lab_model ?? "-"}</td>
                            </>
                          )}
                          <td className="p-8 text-center font-mono font-black text-[#003B73] text-lg bg-blue-50/30">
                            {mark.internal?.toFixed(1) || "-"}
                          </td>
                        </>
                      ) : selectedExam === "lab_marks" || selectedExam === "integrated_lab" ? (
                        <>
                          <td className="p-8 text-center font-mono font-bold text-gray-400">{mark.lab_attendance ?? "-"}</td>
                          <td className="p-8 text-center font-mono font-bold text-gray-400">{mark.lab_observation ?? "-"}</td>
                          <td className="p-8 text-center font-mono font-bold text-gray-400">{mark.lab_record ?? "-"}</td>
                          <td className="p-8 text-center font-mono font-bold text-gray-400">{mark.lab_model ?? "-"}</td>
                          <td className="p-8 text-center font-mono font-black text-[#003B73] text-lg bg-green-50/30">
                            {mark.internal?.toFixed(1) || "-"}
                          </td>
                        </>
                      ) : (
                        <td className="p-8 text-center font-black text-[#003B73] text-lg">
                          {selectedExam === "cia1"
                            ? mark.cia1_test === -1 &&
                              mark.cia1_assignment === -1 &&
                              mark.cia1_attendance === -1
                              ? "ABSENT"
                              : cia1Total.toFixed(1)
                            : selectedExam === "cia2"
                              ? mark.cia2_test === -1 &&
                                mark.cia2_assignment === -1 &&
                                mark.cia2_attendance === -1
                                ? "ABSENT"
                                : cia2Total.toFixed(1)
                              : mark.cia3_test === -1 &&
                                mark.cia3_assignment === -1 &&
                                mark.cia3_attendance === -1
                                ? "ABSENT"
                                : cia3Total.toFixed(1)}
                        </td>
                      )}
                      <td className="p-8 text-center">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                            <Lock size={14} /> Locked
                          </span>
                        ) : isApproved ? (
                          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-wider">
                            <CheckCircle size={14} /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-xs font-black uppercase tracking-wider animate-pulse">
                            <Clock size={14} /> Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const renderCard = (subject) => {
    const examKey = (selectedExam === 'lab_marks' || selectedExam === 'integrated_lab') ? 'internal' : selectedExam;
    const pending = subject[`pending_${examKey}`] || 0;
    const approved = subject[`approved_${examKey}`] || 0;
    const locked = subject[`locked_${examKey}`] || 0;
    const total = pending + approved + locked;

    const isIntegrated = subject.subjectCategory === 'INTEGRATED';

    return (
      <div
        key={subject.subjectId}
        onClick={() => handleSubjectClick(subject)}
        className="group relative bg-white p-8 rounded-[40px] shadow-xl shadow-blue-900/5 border border-gray-100 hover:border-blue-200 transition-all cursor-pointer hover:-translate-y-2"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col gap-2">
            <span className="px-4 py-1.5 bg-blue-50 text-[#003B73] rounded-xl font-black text-[10px] uppercase tracking-wider border border-blue-100 w-fit">
              {subject.subjectCode} {isIntegrated && "(INTEGRATED)"}
            </span>
            <h3 className="text-2xl font-black text-[#003B73] leading-none group-hover:text-blue-600 transition-colors">
              {subject.subjectName}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all">
            <BookOpen size={24} className="text-gray-400 group-hover:text-blue-600" />
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 text-gray-500 font-medium text-sm">
            <Users size={16} className="text-blue-400" />
            {subject.faculty}
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
            {subject.department} • Sem {subject.semester}
          </p>
        </div>

        <div className="flex items-center gap-2 pt-6 border-t border-gray-50">
          {pending > 0 ? (
            <span className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-50 text-amber-700 rounded-2xl font-black text-xs uppercase tracking-wider">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              {pending} Pending
            </span>
          ) : locked > 0 ? (
            <span className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider">
              <Lock size={14} /> Locked
            </span>
          ) : approved > 0 ? (
            <span className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-xs uppercase tracking-wider">
              <CheckCircle size={14} /> Approved
            </span>
          ) : (
            <span className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-300 rounded-2xl font-black text-xs uppercase tracking-wider">
              Not Started
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderSubjectGrid = () => {
    const listToRender = filteredSubjects;

    return (
      <div className="space-y-12">
        <div className="flex items-center gap-6 mb-10">
          <h2 className="text-4xl font-black text-[#003B73] tracking-tight">
            {selectedCategory === 'THEORY' ? "Theory" : selectedCategory === 'LAB' ? "Practical" : "Integrated"}{" "}
            <span className={selectedCategory === 'THEORY' ? "text-blue-600" : selectedCategory === 'LAB' ? "text-purple-600" : "text-emerald-600"}>Modules</span>
          </h2>
          <div className={`flex-1 h-px bg-gradient-to-r ${selectedCategory === 'THEORY' ? 'from-blue-100' : selectedCategory === 'LAB' ? 'from-purple-100' : 'from-emerald-100'} to-transparent`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {listToRender.map(renderCard)}
        </div>

        {listToRender.length === 0 && (
          <div className="py-40 text-center bg-white rounded-[60px] border-2 border-dashed border-gray-100">
            <Filter size={64} className="mx-auto text-gray-100 mb-6" />
            <h3 className="text-2xl font-black text-gray-400">No subjects matches your filters</h3>
          </div>
        )}
      </div>
    );
  };

  const semesters = [...new Set(allSubjects.map((s) => s.semester))].sort(
    (a, b) => a - b,
  );

  return (
    <div className="w-full animate-fadeIn min-h-screen bg-[#F8FAFC]/50 pb-20">
      <div className="max-w-[1600px] mx-auto px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
          <div>
            {viewMode === 'grid' && (
              <button
                onClick={() => setViewMode('selection')}
                className="mb-6 flex items-center gap-3 text-[#003B73] hover:text-blue-700 font-black text-sm uppercase tracking-widest transition-all group"
              >
                <div className="w-10 h-10 rounded-2xl bg-white shadow-lg shadow-blue-900/5 flex items-center justify-center group-hover:bg-[#003B73] group-hover:text-white transition-all transform group-active:scale-90">
                  <ChevronLeft size={20} />
                </div>
                <span>Back to Modules</span>
              </button>
            )}
            <h1 className="text-6xl font-black text-[#003B73] tracking-tighter mb-4 leading-none">
              Marks <span className="text-blue-600">Approval</span>
            </h1>
            <p className="text-gray-500 font-medium text-lg max-w-2xl">
              {viewMode === 'selection'
                ? "Select a category to manage and validate faculty submissions."
                : `Managing all ${selectedCategory === 'THEORY' ? 'Theory' : 'Practical'} modules for the current assessment period.`}
            </p>
          </div>
        </div>

        {viewMode === 'selection' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 py-10">
            {/* Theory Card */}
            <div
              onClick={() => handleCategorySelect('THEORY')}
              className="group relative bg-[#003B73] p-12 rounded-[50px] shadow-2xl overflow-hidden cursor-pointer hover:-translate-y-3 transition-all duration-500 flex flex-col justify-between min-h-[450px]"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative z-10 flex-1">
                <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform">
                  <BookOpen size={40} className="text-white" />
                </div>
                <h2 className="text-4xl font-black text-white mb-4 tracking-tighter leading-tight">Theory <br /> <span className="text-blue-400">Modules</span></h2>
                <p className="text-blue-100/60 font-medium text-base mb-10 max-w-xs">Manage CIA tests, assignments, and internal theory results.</p>
              </div>
              <div className="relative z-10 space-y-6">
                <span className="inline-block px-6 py-3 bg-white/10 rounded-2xl text-white font-black text-sm uppercase tracking-widest">
                  {allSubjects.filter(s => s.subjectCategory === 'THEORY').length} Subjects
                </span>
                <div className="flex items-center gap-3 text-white/40 font-black text-xs uppercase tracking-[0.2em]">
                  Enter Portal <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-[#003B73] font-black group-hover:translate-x-2 transition-transform">→</div>
                </div>
              </div>
            </div>

            {/* Practical Card */}
            <div
              onClick={() => handleCategorySelect('LAB')}
              className="group relative bg-white p-12 rounded-[50px] shadow-2xl border border-gray-100 overflow-hidden cursor-pointer hover:-translate-y-3 transition-all duration-500 flex flex-col justify-between min-h-[450px]"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-100 rounded-full blur-[100px] opacity-50 -mr-20 -mt-20 group-hover:opacity-80 transition-opacity"></div>
              <div className="relative z-10 flex-1">
                <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform">
                  <Users size={40} className="text-purple-600" />
                </div>
                <h2 className="text-4xl font-black text-[#003B73] mb-4 tracking-tighter leading-tight">Practical <br /> <span className="text-purple-600">Modules</span></h2>
                <p className="text-gray-400 font-medium text-base mb-10 max-w-xs">Manage laboratory evaluation and practical assessments.</p>
              </div>
              <div className="relative z-10 space-y-6">
                <span className="inline-block px-6 py-3 bg-purple-50 rounded-2xl text-purple-600 font-black text-sm uppercase tracking-widest text-center">
                  {allSubjects.filter(s => s.subjectCategory === 'LAB').length} Subjects
                </span>
                <div className="flex items-center gap-3 text-gray-300 font-black text-xs uppercase tracking-[0.2em]">
                  Enter Portal <div className="w-8 h-8 bg-[#003B73] rounded-xl flex items-center justify-center text-white font-black group-hover:translate-x-2 transition-transform">→</div>
                </div>
              </div>
            </div>

            {/* Integrated Card */}
            <div
              onClick={() => handleCategorySelect('INTEGRATED')}
              className="group relative bg-[#10B981] p-12 rounded-[50px] shadow-2xl overflow-hidden cursor-pointer hover:-translate-y-3 transition-all duration-500 flex flex-col justify-between min-h-[450px]"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative z-10 flex-1">
                <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform">
                  <Filter size={40} className="text-white" />
                </div>
                <h2 className="text-4xl font-black text-white mb-4 tracking-tighter leading-tight">Integrated <br /> <span className="text-emerald-900/50">Modules</span></h2>
                <p className="text-emerald-50 font-medium text-base mb-10 max-w-xs">Manage combined Theory and Lab components in one place.</p>
              </div>
              <div className="relative z-10 space-y-6">
                <span className="inline-block px-6 py-3 bg-white/10 rounded-2xl text-white font-black text-sm uppercase tracking-widest text-center">
                  {allSubjects.filter(s => s.subjectCategory === 'INTEGRATED').length} Subjects
                </span>
                <div className="flex items-center gap-3 text-white/50 font-black text-xs uppercase tracking-[0.2em]">
                  Enter Portal <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-emerald-600 font-black group-hover:translate-x-2 transition-transform">→</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 animate-slideIn">
              <div className={`p-12 rounded-[50px] shadow-2xl text-white ${selectedCategory === 'THEORY' ? 'bg-gradient-to-br from-[#003B73] to-[#004B8D] shadow-blue-900/20' : 'bg-gradient-to-br from-purple-700 to-purple-900 shadow-purple-900/20'}`}>
                <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-4">Pending Requests</p>
                <p className="text-7xl font-black tracking-tighter mb-6">
                  {filteredSubjects.filter((s) => s[`pending_${(selectedExam === 'lab_marks' || selectedExam === 'integrated_lab') ? 'internal' : selectedExam}`] > 0).length}
                </p>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all duration-1000" style={{ width: `${(filteredSubjects.filter(s => s[`pending_${selectedExam}`] > 0).length / Math.max(1, filteredSubjects.length)) * 100}%` }} />
                </div>
              </div>

              <div className="bg-white p-12 rounded-[50px] shadow-xl shadow-blue-900/5 border border-gray-100">
                <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-4">Active Scope</p>
                <p className="text-7xl font-black tracking-tighter text-[#003B73] mb-6">{filteredSubjects.length}</p>
                <p className="text-sm font-bold text-gray-400 italic">Subjects identified in current filter</p>
              </div>

              <div className="bg-emerald-600 p-12 rounded-[50px] shadow-2xl shadow-emerald-900/20 text-white">
                <p className="text-emerald-100 text-xs font-black uppercase tracking-widest mb-4">Validation Progress</p>
                <p className="text-7xl font-black tracking-tighter mb-6">
                  {Math.round((filteredSubjects.filter(s => s[`pending_${(selectedExam === 'lab_marks' || selectedExam === 'integrated_lab') ? 'internal' : selectedExam}`] === 0).length / Math.max(1, filteredSubjects.length)) * 100)}%
                </p>
                <p className="text-sm font-bold text-emerald-100 uppercase tracking-widest">Target achieved in focus</p>
              </div>
            </div>

            {/* Filters Panel */}
            <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[40px] shadow-xl shadow-blue-900/5 border border-gray-100 mb-20 animate-slideIn">
              <div className="flex flex-col lg:flex-row items-center gap-10">
                <div className="flex items-center gap-4 py-2 px-6 bg-blue-50/50 rounded-2xl border border-blue-100 w-full lg:w-auto">
                  <Filter size={20} className="text-[#003B73]" />
                  <span className="font-black text-[#003B73] uppercase text-xs tracking-widest min-w-[80px]">Quick Filters</span>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Subject Status</label>
                    <CustomSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="ALL">All States</option>
                      <option value="PENDING">Awaiting Approval</option>
                      <option value="COMPLETED">Fully Validated</option>
                    </CustomSelect>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Department</label>
                    <CustomSelect value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                      <option value="">All Disciplines</option>
                      {departments.map((d) => <option key={d.id} value={d.code || d.name}>{d.code || d.name}</option>)}
                    </CustomSelect>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Semester</label>
                    <CustomSelect value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)}>
                      <option value="">All Semesters</option>
                      {semesters.map((sem) => <option key={sem} value={sem}>Semester {sem}</option>)}
                    </CustomSelect>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            {renderSubjectGrid()}
          </>
        )}
      </div >
    </div >
  );
};

export default AdminMarksApproval;
