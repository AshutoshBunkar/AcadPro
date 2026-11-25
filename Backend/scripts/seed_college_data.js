import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
dotenv.config();

import { Admin } from "../models/Admin.js";
import { Faculty } from "../models/Faculty.js";
import { Student } from "../models/Student.js";
import { Subject } from "../models/Subject.js";
import { Semester } from "../models/Semester.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";
import { AcademicSession } from "../models/AcademicSession.js";
import { Topic } from "../models/Topic.js";
import { Lecture } from "../models/Lecture.js";

async function seedData() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_DB_URL);
  console.log("Connected to MongoDB.");

  // 1. Ensure Admin exists with password 'admin123'
  let admin = await Admin.findOne({ email: "aaryankumar1435@gmail.com" });
  if (!admin) {
    admin = await Admin.create({
      name: "Aryan Kumar (Admin)",
      email: "aaryankumar1435@gmail.com",
      password: "admin123",
      role: "admin",
      designation: "Chief System Administrator",
      phone: "+91 (020) 2690-2101",
    });
    console.log("Created master admin account.");
  } else {
    admin.password = "admin123";
    await admin.save();
    console.log("Verified master admin account.");
  }

  // 2. Seed Academic Sessions & Semesters
  await AcademicSession.deleteMany({});
  await AcademicSession.create({
    academicYear: "2025-2026",
    semester: 4,
    isActive: true,
  });

  await Semester.deleteMany({});
  const sem3 = await Semester.create({
    academicYear: "2025-2026",
    semesterNumber: 3,
    name: "Autumn 2025 - Semester 3",
    status: "archived",
    isCurrent: false,
  });
  const sem4 = await Semester.create({
    academicYear: "2025-2026",
    semesterNumber: 4,
    name: "Spring 2026 - Semester 4",
    status: "active",
    isCurrent: true,
  });
  console.log("Created Semesters 3 and 4.");

  // 3. Seed Faculty
  const salt = await bcrypt.genSalt(10);
  const commonPasswordHash = await bcrypt.hash("Password@123", salt);

  const facultiesData = [
    {
      name: "Dr. Ramesh Chandra",
      email: "ramesh.chandra@iiitp.ac.in",
      password: "Password@123",
      designation: "Professor & HOD",
      specialization: "Operating Systems & Distributed Systems",
      phone: "+91 (020) 2690-2101",
      officeLocation: "Academic Block A, Room 301",
      officeHours: "Mon, Wed 10:00 AM - 12:00 PM",
    },
    {
      name: "Dr. Priya Sharma",
      email: "priya.sharma@iiitp.ac.in",
      password: "Password@123",
      designation: "Associate Professor",
      specialization: "Database Systems & Machine Learning",
      phone: "+91 (020) 2690-2102",
      officeLocation: "Academic Block A, Room 304",
      officeHours: "Tue, Thu 2:00 PM - 4:00 PM",
    },
    {
      name: "Dr. Anand Kulkarni",
      email: "anand.kulkarni@iiitp.ac.in",
      password: "Password@123",
      designation: "Assistant Professor",
      specialization: "Data Structures & Algorithm Optimization",
      phone: "+91 (020) 2690-2105",
      officeLocation: "Academic Block B, Room 102",
      officeHours: "Wed, Fri 3:00 PM - 5:00 PM",
    },
    {
      name: "Dr. Vikramaditya Joshi",
      email: "vikram.joshi@iiitp.ac.in",
      password: "Password@123",
      designation: "Professor & HOD",
      specialization: "Signal Processing & Embedded VLSI",
      phone: "+91 (020) 2690-2108",
      officeLocation: "ECE Block, Room 201",
      officeHours: "Mon, Fri 11:00 AM - 1:00 PM",
    },
    {
      name: "Dr. Neha Agarwal",
      email: "neha.agarwal@iiitp.ac.in",
      password: "Password@123",
      designation: "Assistant Professor",
      specialization: "Computer Networks & Wireless Communication",
      phone: "+91 (020) 2690-2110",
      officeLocation: "Academic Block B, Room 208",
      officeHours: "Thu 11:00 AM - 1:00 PM",
    },
  ];

  await Faculty.deleteMany({});
  const createdFaculties = [];
  for (const fac of facultiesData) {
    const f = await Faculty.create(fac);
    createdFaculties.push(f);
  }
  console.log(`Created ${createdFaculties.length} faculty members.`);

  // 4. Seed Subjects
  await Subject.deleteMany({});
  const subjectsData = [
    {
      name: "Data Structures & Algorithms",
      code: "CS201",
      department: "CSE",
      year: 2,
      allowedSemesters: [3, 4],
    },
    {
      name: "Database Management Systems",
      code: "CS302",
      department: "CSE",
      year: 2,
      allowedSemesters: [3, 4],
    },
    {
      name: "Computer Networks & Protocols",
      code: "CS303",
      department: "CSE",
      year: 2,
      allowedSemesters: [3, 4],
    },
    {
      name: "Digital Signal Processing",
      code: "EC301",
      department: "ECE",
      year: 2,
      allowedSemesters: [3, 4],
    },
  ];

  const createdSubjects = [];
  for (const sub of subjectsData) {
    const s = await Subject.create(sub);
    createdSubjects.push(s);
  }
  console.log(`Created ${createdSubjects.length} subjects.`);

  // 5. Seed Teaching Assignments
  await TeachingAssignment.deleteMany({});
  const ta1 = await TeachingAssignment.create({
    facultyId: createdFaculties[2]._id, // Dr. Anand Kulkarni
    subjectId: createdSubjects[0]._id, // CS201 DSA
    semester: 4,
    semesterId: sem4._id,
    academicYear: "2025-2026",
    status: "active",
  });
  const ta2 = await TeachingAssignment.create({
    facultyId: createdFaculties[1]._id, // Dr. Priya Sharma
    subjectId: createdSubjects[1]._id, // CS302 DBMS
    semester: 4,
    semesterId: sem4._id,
    academicYear: "2025-2026",
    status: "active",
  });
  const ta3 = await TeachingAssignment.create({
    facultyId: createdFaculties[4]._id, // Dr. Neha Agarwal
    subjectId: createdSubjects[2]._id, // CS303 Networks
    semester: 4,
    semesterId: sem4._id,
    academicYear: "2025-2026",
    status: "active",
  });
  const ta4 = await TeachingAssignment.create({
    facultyId: createdFaculties[3]._id, // Dr. Vikramaditya Joshi
    subjectId: createdSubjects[3]._id, // EC301 DSP
    semester: 4,
    semesterId: sem4._id,
    academicYear: "2025-2026",
    status: "active",
  });
  console.log("Assigned faculties to subjects.");

  // 6. Seed Students
  await Student.deleteMany({});
  const studentsData = [
    {
      name: "Aarav Sharma",
      mis: "112203001",
      email: "aarav.sharma@iiitp.ac.in",
      password: commonPasswordHash,
      department: "CSE",
      year: 2,
      currentSemester: 4,
    },
    {
      name: "Rhea Patel",
      mis: "112203002",
      email: "rhea.patel@iiitp.ac.in",
      password: commonPasswordHash,
      department: "CSE",
      year: 2,
      currentSemester: 4,
    },
    {
      name: "Rohan Gupta",
      mis: "112203003",
      email: "rohan.gupta@iiitp.ac.in",
      password: commonPasswordHash,
      department: "CSE",
      year: 2,
      currentSemester: 4,
    },
    {
      name: "Ananya Iyer",
      mis: "112203004",
      email: "ananya.iyer@iiitp.ac.in",
      password: commonPasswordHash,
      department: "CSE",
      year: 2,
      currentSemester: 4,
    },
    {
      name: "Kabir Verma",
      mis: "112203005",
      email: "kabir.verma@iiitp.ac.in",
      password: commonPasswordHash,
      department: "CSE",
      year: 2,
      currentSemester: 4,
    },
    {
      name: "Ishaan Nair",
      mis: "112204001",
      email: "ishaan.nair@iiitp.ac.in",
      password: commonPasswordHash,
      department: "ECE",
      year: 2,
      currentSemester: 4,
    },
    {
      name: "Diya Sengupta",
      mis: "112204002",
      email: "diya.sengupta@iiitp.ac.in",
      password: commonPasswordHash,
      department: "ECE",
      year: 2,
      currentSemester: 4,
    },
    {
      name: "Aditya Mehta",
      mis: "112204003",
      email: "aditya.mehta@iiitp.ac.in",
      password: commonPasswordHash,
      department: "ECE",
      year: 2,
      currentSemester: 4,
    },
  ];

  const createdStudents = await Student.insertMany(studentsData);
  console.log(`Created ${createdStudents.length} students.`);

  // 7. Seed Student Enrollments
  await StudentEnrollment.deleteMany({});
  for (const st of createdStudents) {
    if (st.department === "CSE") {
      // Enroll in CS201, CS302, CS303
      await StudentEnrollment.create({
        studentId: st._id,
        subjectId: createdSubjects[0]._id,
        facultyId: createdFaculties[2]._id,
        teachingAssignmentId: ta1._id,
        semesterId: sem4._id,
        semester: 4,
        academicYear: "2025-2026",
        status: "enrolled",
      });
      await StudentEnrollment.create({
        studentId: st._id,
        subjectId: createdSubjects[1]._id,
        facultyId: createdFaculties[1]._id,
        teachingAssignmentId: ta2._id,
        semesterId: sem4._id,
        semester: 4,
        academicYear: "2025-2026",
        status: "enrolled",
      });
      await StudentEnrollment.create({
        studentId: st._id,
        subjectId: createdSubjects[2]._id,
        facultyId: createdFaculties[4]._id,
        teachingAssignmentId: ta3._id,
        semesterId: sem4._id,
        semester: 4,
        academicYear: "2025-2026",
        status: "enrolled",
      });
    } else {
      // Enroll in EC301
      await StudentEnrollment.create({
        studentId: st._id,
        subjectId: createdSubjects[3]._id,
        facultyId: createdFaculties[3]._id,
        teachingAssignmentId: ta4._id,
        semesterId: sem4._id,
        semester: 4,
        academicYear: "2025-2026",
        status: "enrolled",
      });
    }
  }
  console.log("Enrolled students in semester 4 subjects.");

  // 8. Seed Sample Topics & Lectures for interactive viewing
  await Topic.deleteMany({});
  await Lecture.deleteMany({});

  const topic1 = await Topic.create({
    name: "Graph Algorithms & Shortest Path",
    subjectId: createdSubjects[0]._id, // CS201
    order: 1,
  });
  const topic2 = await Topic.create({
    name: "Dynamic Programming & Memoization",
    subjectId: createdSubjects[0]._id, // CS201
    order: 2,
  });
  const topic3 = await Topic.create({
    name: "Relational Algebra & Normalization",
    subjectId: createdSubjects[1]._id, // CS302
    order: 1,
  });

  await Lecture.create({
    title: "Dijkstra's & Bellman-Ford Foundations",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    cloudinaryPublicId: "samples/dijkstra_v1",
    thumbnailUrl: "https://images.unsplash.com/photo-1516116211227-bbc13c72b225?w=500&auto=format&fit=crop&q=60",
    topicId: topic1._id,
    uploadedBy: createdFaculties[2]._id,
    duration: 2740,
    description: "In-depth derivation and complexity proofs for Dijkstra with priority queues.",
  });

  await Lecture.create({
    title: "0/1 Knapsack & Bellman Equations",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    cloudinaryPublicId: "samples/knapsack_v1",
    thumbnailUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=60",
    topicId: topic2._id,
    uploadedBy: createdFaculties[2]._id,
    duration: 3120,
    description: "Recursive state representation, memoization tables, and space optimization.",
  });

  console.log("Seeded sample topics and lectures.");

  console.log("\n=== ACADEX REALISTIC COLLEGE DATA SEEDED SUCCESSFULLY! ===");
  process.exit(0);
}

seedData().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
