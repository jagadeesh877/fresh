import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Loader, Calendar, User } from "lucide-react";

const FacultyTimetable = () => {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper for Local Date
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Date for context
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  const periods = [
    { id: 1, label: "09:15-10:05", type: "class" },
    { id: 2, label: "10:05-10:55", type: "class" },
    { id: "B1", label: "10:55-11:15", type: "break", name: "Break" },
    { id: 3, label: "11:15-12:05", type: "class" },
    { id: 4, label: "12:05-12:55", type: "class" },
    { id: "L", label: "12:55-01:45", type: "break", name: "Lunch" },
    { id: 5, label: "01:45-02:30", type: "class" },
    { id: "B2", label: "02:30-02:45", type: "break", name: "Break" }, // Adjusted break location based on prompt or keep standard? Prompt said B2 3:15. Sticking to standard for conflict avoidance.
    // Actually adhering to the periods defined in admin view:
    // 5: 01:45-02:30, 6: 02:30-03:15, B2: 03:15-03:25, 7: 03:25-04:10, 8: 04:10-04:50
    // I will copy periods from TimetableManager for consistency.
  ];

  const periodsConsistent = [
    { id: 1, label: "09:15-10:05", type: "class" },
    { id: 2, label: "10:05-10:55", type: "class" },
    { id: "B1", label: "10:55-11:15", type: "break", name: "Break" },
    { id: 3, label: "11:15-12:05", type: "class" },
    { id: 4, label: "12:05-12:55", type: "class" },
    { id: "L", label: "12:55-01:45", type: "break", name: "Lunch" },
    { id: 5, label: "01:45-02:30", type: "class" },
    { id: 6, label: "02:30-03:15", type: "class" },
    { id: "B2", label: "03:15-03:25", type: "break", name: "Break" },
    { id: 7, label: "03:25-04:10", type: "class" },
    { id: 8, label: "04:10-04:50", type: "class" },
  ];

  useEffect(() => {
    fetchMyTimetable();
  }, [selectedDate]);

  const fetchMyTimetable = async () => {
    setLoading(true);
    try {
      const res = await api.get("/faculty/timetable", {
        params: { date: selectedDate },
      });
      console.log("[DEBUG] Faculty Timetable API Response:", res.data);
      setTimetable(res.data);
    } catch (err) {
      console.error("[ERROR] Failed to fetch faculty timetable:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderCell = (day, p) => {
    const entry = timetable.find((t) => t.day === day && t.period === p.id);

    if (!entry) {
      return (
        <td
          key={p.id}
          className="p-3 border border-gray-100 bg-gray-50/30 text-center text-gray-400 text-xs"
        >
          -
        </td>
      );
    }

    // Check if substitute
    const isSubstitute = entry.isSubstitute;
    const isCovered = entry.isCovered; // New Flag: I am supposed to be here, but someone replaced me.

    return (
      <td
        key={p.id}
        className={`p-3 border border-gray-100 text-center relative group transition-all duration-200
                ${isSubstitute ? "bg-orange-50 border-orange-200 hover:bg-orange-100" : ""}
                ${isCovered ? "bg-gray-100 border-gray-200 opacity-60" : ""}
                ${!isSubstitute && !isCovered ? "hover:bg-blue-50 bg-white" : ""}
                ${entry.type === "LAB" && !isCovered ? "border-l-4 border-l-blue-500" : ""}
            `}
      >
        <div
          className={`font-bold text-sm ${isSubstitute ? "text-orange-900" : isCovered ? "text-gray-500 line-through" : "text-gray-800"}`}
        >
          {entry.subject?.shortName || entry.subjectName}
        </div>
        <div className="text-xs text-[#003B73] font-medium mt-1">
          {entry.department} {entry.year}-{entry.section}
        </div>
        {entry.room && (
          <div className="text-[10px] text-gray-500 mt-1 inline-block px-2 py-0.5 bg-gray-100 rounded-full">
            Room {entry.room}
          </div>
        )}
        {isSubstitute && (
          <div className="mt-2 text-[10px] uppercase tracking-wider font-bold text-orange-600 border border-orange-200 bg-orange-100 rounded px-1 py-0.5">
            Substitute (Today)
          </div>
        )}
        {isCovered && (
          <div className="mt-2 text-[10px] uppercase tracking-wider font-bold text-gray-500 border border-gray-300 bg-gray-200 rounded px-1 py-0.5">
            Covered by {entry.coveredBy}
          </div>
        )}

        {/* Tooltip for substitute details */}
        {isSubstitute && entry.originalFaculty && (
          <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
            Covering for {entry.originalFaculty}
          </div>
        )}
      </td>
    );
  };

  if (loading)
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin text-[#003B73]" size={32} />
          <p className="text-gray-500 font-medium">Loading Schedule...</p>
        </div>
      </div>
    );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Schedule</h2>
          <p className="text-gray-500 text-sm mt-1">
            View your weekly classes and substitutions
          </p>
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
          <Calendar size={18} className="text-[#003B73]" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Viewing Date:
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="outline-none text-sm font-semibold text-gray-800 bg-transparent cursor-pointer"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 w-24 text-left font-bold text-gray-600 text-sm uppercase tracking-wider">
                  Day
                </th>
                {periodsConsistent.map((p, idx) => (
                  <th
                    key={idx}
                    className={`p-3 text-center font-bold text-gray-600 text-xs uppercase tracking-wider ${p.type === "break" ? "w-10 bg-gray-100" : "w-32"}`}
                  >
                    {p.type === "break" ? (
                      <span className="writing-vertical-lr transform rotate-180 h-20 text-[10px] text-gray-400">
                        {p.name}
                      </span>
                    ) : (
                      <div>
                        {p.label}
                        <div className="text-[10px] text-gray-400 mt-1">
                          {p.id}
                        </div>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {days.map((day) => (
                <tr key={day} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-gray-700 bg-gray-50/50">
                    {day}
                  </td>
                  {periodsConsistent.map((p, idx) => {
                    if (p.type === "break") {
                      return <td key={idx} className="bg-gray-100/50"></td>;
                    }
                    return renderCell(day, p);
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-white border border-gray-200 rounded-sm"></div>
          <span>Empty Slot</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-white border border-l-4 border-l-blue-500 border-gray-200 rounded-sm"></div>
          <span>Regular Class (Theory/Lab)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-50 border border-orange-200 rounded-sm"></div>
          <span className="font-medium text-orange-700">Substituted Class</span>
        </div>
      </div>
    </div>
  );
};

export default FacultyTimetable;
