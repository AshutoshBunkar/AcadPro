import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./Backend/.env" });

import { AcademicSession } from "../models/AcademicSession.js";
import { Semester } from "../models/Semester.js";
import { Subject } from "../models/Subject.js";
import { Student } from "../models/Student.js";
import { Faculty } from "../models/Faculty.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";
import { Admin } from "../models/Admin.js";
import { Notification } from "../models/Notification.js";
import {
  ACTIVE_ACADEMIC_YEAR,
  ACTIVE_SEMESTERS,
  formatSemesterLabel,
} from "../utils/academicConfig.js";

async function reconcile() {
  console.log("Starting Academic 2026-2027 Data Reconciliation & Notification Seeding...");
  await mongoose.connect(process.env.MONGO_DB_URL);
  console.log("Connected to MongoDB Atlas.");

  // =========================================================================
  // 1. RECONCILE ACADEMIC SESSION
  // =========================================================================
  console.log("\n--- 1. Reconciling Academic Session ---");
  const activeSession = await AcademicSession.findOneAndUpdate(
    {},
    { academicYear: ACTIVE_ACADEMIC_YEAR, semester: 3 },
    { new: true, upsert: true }
  );
  // Remove any redundant session documents if they exist
  await AcademicSession.deleteMany({ _id: { $ne: activeSession._id } });
  console.log(`Active session set: AY ${activeSession.academicYear}, Semester ${activeSession.semester}`);

  // =========================================================================
  // 2. RECONCILE SEMESTERS FOR 2026-2027
  // =========================================================================
  console.log("\n--- 2. Reconciling Semesters for 2026-2027 ---");
  // Active semesters must be strictly 1, 3, 5, 7
  const semesterDefinitions = [
    { num: 1, name: "AY 2026-2027 - 1st Semester", status: "pending_enrollment", isCurrent: false },
    { num: 3, name: "AY 2026-2027 - 3rd Semester", status: "active", isCurrent: true },
    { num: 5, name: "AY 2026-2027 - 5th Semester", status: "active", isCurrent: false },
    { num: 7, name: "AY 2026-2027 - 7th Semester", status: "pending_enrollment", isCurrent: false },
  ];

  const semesterDocs = {};
  for (const def of semesterDefinitions) {
    let sem = await Semester.findOne({
      academicYear: ACTIVE_ACADEMIC_YEAR,
      semesterNumber: def.num,
    });

    if (sem) {
      sem.name = def.name;
      sem.status = def.status;
      sem.isCurrent = def.isCurrent;
      await sem.save();
      console.log(`Updated Semester ${def.num}: ${sem.name} (${sem.status})`);
    } else {
      sem = await Semester.create({
        academicYear: ACTIVE_ACADEMIC_YEAR,
        semesterNumber: def.num,
        name: def.name,
        status: def.status,
        isCurrent: def.isCurrent,
        description: `Curriculum term block for ${formatSemesterLabel(def.num)} in AY ${ACTIVE_ACADEMIC_YEAR}`,
      });
      console.log(`Created Semester ${def.num}: ${sem.name} (${sem.status})`);
    }
    semesterDocs[def.num] = sem;
  }

  // Archive any stray 2026-2027 semesters outside 1, 3, 5, 7 (e.g., stray Sem 4)
  const stray2026Semesters = await Semester.find({
    academicYear: ACTIVE_ACADEMIC_YEAR,
    semesterNumber: { $nin: ACTIVE_SEMESTERS },
  });

  for (const stray of stray2026Semesters) {
    stray.status = "archived";
    stray.isCurrent = false;
    await stray.save();
    console.log(`Archived obsolete Semester ${stray.semesterNumber} for AY ${ACTIVE_ACADEMIC_YEAR}`);
  }

  // Historical semesters from 2025-2026 (e.g., Sem 4) - preserve but mark isCurrent = false
  await Semester.updateMany(
    { academicYear: { $ne: ACTIVE_ACADEMIC_YEAR } },
    { $set: { isCurrent: false, status: "completed" } }
  );
  console.log("Preserved historical semesters from previous academic years.");

  // =========================================================================
  // 3. RECONCILE FACULTY TEACHING ASSIGNMENTS FOR 2026-2027
  // =========================================================================
  console.log("\n--- 3. Reconciling Faculty Teaching Assignments for 2026-2027 ---");
  const facultyMembers = await Faculty.find().lean();
  const subjects = await Subject.find().lean();

  const facultyByEmail = {};
  for (const f of facultyMembers) facultyByEmail[f.email] = f;

  const subjectsByCode = {};
  for (const s of subjects) subjectsByCode[s.code] = s;

  // Assignments for AY 2026-2027:
  // Sem 3:
  // - CS201 -> Dr. Anand Kulkarni
  // - CS302 -> Dr. Priya Sharma
  // - CS303 -> Dr. Neha Agarwal
  // - EC301 -> Dr. Vikramaditya Joshi
  // Sem 5:
  // - CS401 -> Dr. Ramesh Chandra
  const assignmentsConfig = [
    {
      facultyEmail: "anand.kulkarni@iiitp.ac.in",
      subjectCode: "CS201",
      semester: 3,
      section: "A",
      dept: "CSE",
    },
    {
      facultyEmail: "priya.sharma@iiitp.ac.in",
      subjectCode: "CS302",
      semester: 3,
      section: "A",
      dept: "CSE",
    },
    {
      facultyEmail: "neha.agarwal@iiitp.ac.in",
      subjectCode: "CS303",
      semester: 3,
      section: "A",
      dept: "CSE",
    },
    {
      facultyEmail: "vikram.joshi@iiitp.ac.in",
      subjectCode: "EC301",
      semester: 3,
      section: "A",
      dept: "ECE",
    },
    {
      facultyEmail: "ramesh.chandra@iiitp.ac.in",
      subjectCode: "CS401",
      semester: 5,
      section: "A",
      dept: "CSE",
    },
  ];

  const teachingAssignmentDocs = {};
  for (const cfg of assignmentsConfig) {
    const faculty = facultyByEmail[cfg.facultyEmail];
    const subject = subjectsByCode[cfg.subjectCode];

    if (!faculty || !subject) {
      console.warn(`Skipping assignment: missing faculty ${cfg.facultyEmail} or subject ${cfg.subjectCode}`);
      continue;
    }

    let ta = await TeachingAssignment.findOne({
      facultyId: faculty._id,
      subjectId: subject._id,
      academicYear: ACTIVE_ACADEMIC_YEAR,
      semester: cfg.semester,
    });

    if (ta) {
      ta.status = "active";
      ta.section = cfg.section;
      ta.department = cfg.dept;
      ta.program = "B.Tech";
      await ta.save();
      console.log(`Active assignment confirmed: ${faculty.name} -> ${subject.code} (Sem ${cfg.semester}, AY ${ACTIVE_ACADEMIC_YEAR})`);
    } else {
      ta = await TeachingAssignment.create({
        facultyId: faculty._id,
        subjectId: subject._id,
        academicYear: ACTIVE_ACADEMIC_YEAR,
        semester: cfg.semester,
        section: cfg.section,
        department: cfg.dept,
        program: "B.Tech",
        status: "active",
      });
      console.log(`Created assignment: ${faculty.name} -> ${subject.code} (Sem ${cfg.semester}, AY ${ACTIVE_ACADEMIC_YEAR})`);
    }
    teachingAssignmentDocs[`${subject.code}_${cfg.semester}`] = ta;
  }

  // =========================================================================
  // 4. RECONCILE STUDENT PROFILES & ENROLLMENTS FOR 2026-2027
  // =========================================================================
  console.log("\n--- 4. Reconciling Students & Enrollments for 2026-2027 ---");
  // Year 2 students: update currentSemester to 3 for active odd term 2026-2027
  const year2Students = await Student.find({ year: 2 });
  for (const st of year2Students) {
    st.currentSemester = 3;
    await st.save();
    console.log(`Updated student ${st.name} (${st.department}): year=2, currentSemester=3`);
  }

  // Year 3 student (Abhay Gugale): currentSemester = 5
  const year3Students = await Student.find({ year: 3 });
  for (const st of year3Students) {
    st.currentSemester = 5;
    await st.save();
    console.log(`Confirmed student ${st.name} (${st.department}): year=3, currentSemester=5`);
  }

  // Enroll Year 2 CSE students in CS201, CS302, CS303 for 2026-2027 Sem 3
  const cseSem3Codes = ["CS201", "CS302", "CS303"];
  const cseYear2 = await Student.find({ department: "CSE", year: 2 });
  const sem3Doc = semesterDocs[3];

  let newEnrollmentsCount = 0;
  for (const student of cseYear2) {
    for (const code of cseSem3Codes) {
      const subject = subjectsByCode[code];
      const ta = teachingAssignmentDocs[`${code}_3`];

      const existing = await StudentEnrollment.findOne({
        studentId: student._id,
        subjectId: subject._id,
        academicYear: ACTIVE_ACADEMIC_YEAR,
        semester: 3,
      });

      if (!existing) {
        await StudentEnrollment.create({
          studentId: student._id,
          subjectId: subject._id,
          academicYear: ACTIVE_ACADEMIC_YEAR,
          semester: 3,
          semesterId: sem3Doc._id,
          facultyId: ta?.facultyId || null,
          teachingAssignmentId: ta?._id || null,
          status: "enrolled",
          section: "A",
          department: "CSE",
          program: "B.Tech",
          enrolledAt: new Date(),
        });
        newEnrollmentsCount++;
        console.log(`Enrolled ${student.name} in ${code} (Sem 3, AY ${ACTIVE_ACADEMIC_YEAR})`);
      }
    }
  }

  // Enroll Year 2 ECE students in EC301 for 2026-2027 Sem 3
  const eceYear2 = await Student.find({ department: "ECE", year: 2 });
  for (const student of eceYear2) {
    const subject = subjectsByCode["EC301"];
    const ta = teachingAssignmentDocs["EC301_3"];

    const existing = await StudentEnrollment.findOne({
      studentId: student._id,
      subjectId: subject._id,
      academicYear: ACTIVE_ACADEMIC_YEAR,
      semester: 3,
    });

    if (!existing) {
      await StudentEnrollment.create({
        studentId: student._id,
        subjectId: subject._id,
        academicYear: ACTIVE_ACADEMIC_YEAR,
        semester: 3,
        semesterId: sem3Doc._id,
        facultyId: ta?.facultyId || null,
        teachingAssignmentId: ta?._id || null,
        status: "enrolled",
        section: "A",
        department: "ECE",
        program: "B.Tech",
        enrolledAt: new Date(),
      });
      newEnrollmentsCount++;
      console.log(`Enrolled ${student.name} in EC301 (Sem 3, AY ${ACTIVE_ACADEMIC_YEAR})`);
    }
  }

  // Abhay Gugale (Year 3 CSE) - ensure enrolled in CS401 for 2026-2027 Sem 5
  const sem5Doc = semesterDocs[5];
  const cs401Sub = subjectsByCode["CS401"];
  const cs401Ta = teachingAssignmentDocs["CS401_5"];
  for (const student of year3Students) {
    const existing = await StudentEnrollment.findOne({
      studentId: student._id,
      subjectId: cs401Sub._id,
      academicYear: ACTIVE_ACADEMIC_YEAR,
      semester: 5,
    });

    if (!existing) {
      await StudentEnrollment.create({
        studentId: student._id,
        subjectId: cs401Sub._id,
        academicYear: ACTIVE_ACADEMIC_YEAR,
        semester: 5,
        semesterId: sem5Doc._id,
        facultyId: cs401Ta?.facultyId || null,
        teachingAssignmentId: cs401Ta?._id || null,
        status: "enrolled",
        section: "A",
        department: "CSE",
        program: "B.Tech",
        enrolledAt: new Date(),
      });
      newEnrollmentsCount++;
      console.log(`Enrolled ${student.name} in CS401 (Sem 5, AY ${ACTIVE_ACADEMIC_YEAR})`);
    }
  }

  console.log(`Total new 2026-2027 enrollments created: ${newEnrollmentsCount}`);

  // =========================================================================
  // 5. SEED INITIAL NOTIFICATIONS FOR USERS
  // =========================================================================
  console.log("\n--- 5. Seeding Notifications for Admin, Faculty, and Students ---");

  // A. Admin notifications
  const admin = await Admin.findOne();
  if (admin) {
    const adminNotifications = [
      {
        recipient: admin._id,
        recipientRole: "admin",
        title: "Academic Year 2026-2027 Configured",
        message: "Academic configuration is successfully locked to 2026-2027. Active semester offerings: 1st, 3rd, 5th, and 7th Semester.",
        type: "system",
        link: "/admin/profile",
      },
      {
        recipient: admin._id,
        recipientRole: "admin",
        title: "Faculty Teaching Allocation Completed",
        message: "Teaching assignments across active semesters for AY 2026-2027 have been reconciled and verified.",
        type: "assignment",
        link: "/admin/dashboard",
      },
      {
        recipient: admin._id,
        recipientRole: "admin",
        title: "Cohort Registration Sync",
        message: "Year 2 CSE and ECE cohorts have been registered into 3rd Semester core subjects.",
        type: "enrollment",
        link: "/admin/dashboard",
      },
    ];

    for (const notif of adminNotifications) {
      const exists = await Notification.findOne({
        recipient: notif.recipient,
        title: notif.title,
      });
      if (!exists) {
        await Notification.create(notif);
        console.log(`Seeded notification for Admin: ${notif.title}`);
      }
    }
  }

  // B. Faculty notifications
  for (const cfg of assignmentsConfig) {
    const faculty = facultyByEmail[cfg.facultyEmail];
    const subject = subjectsByCode[cfg.subjectCode];
    if (faculty && subject) {
      const title = `Course Assignment: ${subject.code}`;
      const exists = await Notification.findOne({
        recipient: faculty._id,
        title,
      });
      if (!exists) {
        await Notification.create({
          recipient: faculty._id,
          recipientRole: "faculty",
          title,
          message: `You have been assigned to instruct ${subject.code} (${subject.name}) for ${formatSemesterLabel(cfg.semester)}, AY ${ACTIVE_ACADEMIC_YEAR}.`,
          type: "assignment",
          link: "/faculty/dashboard",
        });
        console.log(`Seeded notification for Faculty ${faculty.name}: ${title}`);
      }
    }
  }

  // C. Student notifications
  const allStudents = await Student.find();
  for (const st of allStudents) {
    const semLabel = formatSemesterLabel(st.currentSemester);
    const title = `${semLabel} Enrollment Confirmed`;
    const exists = await Notification.findOne({
      recipient: st._id,
      title,
    });
    if (!exists) {
      await Notification.create({
        recipient: st._id,
        recipientRole: "student",
        title,
        message: `Welcome to ${semLabel} (AY ${ACTIVE_ACADEMIC_YEAR}). Your departmental subjects have been successfully registered.`,
        type: "enrollment",
        link: "/student/dashboard",
      });
      console.log(`Seeded enrollment notification for Student ${st.name}`);
    }

    const scheduleTitle = `${semLabel} Schedule Available`;
    const existsSchedule = await Notification.findOne({
      recipient: st._id,
      title: scheduleTitle,
    });
    if (!existsSchedule) {
      await Notification.create({
        recipient: st._id,
        recipientRole: "student",
        title: scheduleTitle,
        message: `Your lecture timetable for ${semLabel} is now live. Please review your session timings.`,
        type: "lecture",
        link: "/student/dashboard",
      });
      console.log(`Seeded timetable notification for Student ${st.name}`);
    }
  }

  console.log("\nReconciliation & seeding completed successfully!");
  await mongoose.disconnect();
}

reconcile().catch((err) => {
  console.error("Reconciliation failed:", err);
  process.exit(1);
});
