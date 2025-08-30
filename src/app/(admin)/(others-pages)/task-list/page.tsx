'use client';

import React from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import TaskListBoard from '@/components/tasks/TaskListBoard';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';

export default function TaskListPage() {
  return (
    <AuthGuard requiredPermission="tasklist">
      <PageBreadcrumb pageTitle="Task List" />
      <div className="space-y-4">
        <TaskListBoard />
      </div>
    </AuthGuard>
  );
}
