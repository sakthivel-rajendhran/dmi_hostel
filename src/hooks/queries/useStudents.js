"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys.js";
import { studentService } from "@/lib/services/studentService.js";

export function useStudents(filters = {}) {
  return useQuery({
    queryKey: queryKeys.students.list(filters),
    queryFn: async () => {
      const res = await studentService.listStudents(filters);
      if (!res.ok) throw new Error(res.message);
      return res.data || [];
    },
  });
}

export function useStudent(studentId) {
  return useQuery({
    queryKey: queryKeys.students.detail(studentId),
    queryFn: async () => {
      const res = await studentService.getStudentById(studentId);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    enabled: !!studentId,
  });
}

export const useMyProfile = useStudent;

export function useProfileCompleteness(studentId) {
  return useQuery({
    queryKey: queryKeys.students.completeness(studentId),
    queryFn: async () => {
      const res = await studentService.getProfileCompleteness(studentId);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    enabled: !!studentId,
  });
}

export function useStudentStats() {
  return useQuery({
    queryKey: queryKeys.students.stats,
    queryFn: async () => {
      const res = await studentService.getStudentStats();
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => studentService.createStudent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, patch }) => studentService.updateStudent(studentId, patch),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.completeness(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: ["student"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export const useUpdateProfile = useUpdateStudent;

export function useRooms(floor = "all") {
  return useQuery({
    queryKey: ["rooms", floor],
    queryFn: async () => {
      const res = await studentService.getRooms({ floor });
      if (!res.ok) throw new Error(res.message);
      return res.data || [];
    },
  });
}
