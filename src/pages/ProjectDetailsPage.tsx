import { useAuth } from '../app/AuthContext';

export const ProjectDetailsPage = () => {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';

  return (
    <section>
      <h1>Project Details</h1>
      <p>Пустая страница MVP.</p>
      <button type="button" disabled={!canEdit}>
        Редактировать проект
      </button>
      {!canEdit && <p>Роль viewer: редактирование недоступно.</p>}
    </section>
  );
};
