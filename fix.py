import re

with open('frontend/src/pages/tasks/TaskPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. replace definition
text = text.replace(
    '''  const isTeamLeader = teams.some((team) => Number(team.leader_id) === Number(user?.id));
  const canManageTasks = isAdminOrManager || isTeamLeader;''',
    '''  const checkIsTeamLeaderOfProject = (projectId: number) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project || !project.team_id) return false;
    const team = teams.find((t) => t.id === project.team_id);
    return team ? Number(team.leader_id) === Number(user?.id) : false;
  };

  const canEditTask = (task: TaskItem | null) => {
    if (!task) return isAdminOrManager;
    if (isAdminOrManager) return true;
    if (Number(task.created_by) === Number(user?.id)) return true;
    return checkIsTeamLeaderOfProject(task.project_id);
  };'''
)

text = text.replace('disabled={!canManageTasks}', 'disabled={!canEditTask(null)}')
text = text.replace('disabled={!canManageTasks && Number(task.assigned_to) !== Number(user?.id)}', 'disabled={!canEditTask(task) && Number(task.assigned_to) !== Number(user?.id)}')
text = text.replace('canEdit={canManageTasks}', 'canEdit={canEditTask(editingTask)}')
text = text.replace("{canManageTasks ? 'Sửa' : 'Xem'}", "{canEditTask(row.original) ? 'Sửa' : 'Xem'}")
text = text.replace("{canManageTasks && (", "{canEditTask(row.original) && (")

create_str_old = '''{canEditTask(row.original) && (
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
                Tạo Task Mới
              </Button>
            )}'''
create_str_new = '''{canEditTask(null) && (
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
                Tạo Task Mới
              </Button>
            )}'''
text = text.replace(create_str_old, create_str_new)

with open('frontend/src/pages/tasks/TaskPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
