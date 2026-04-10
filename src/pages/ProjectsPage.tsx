import { Link } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';

export const ProjectsPage = () => {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';

  return (
    <section>
      <h1>Projects</h1>
      <p>Пустая страница MVP.</p>
      <p>
        Демонстрационный проект: <Link to="/projects/1">Project #1</Link>
      </p>
      <button type="button" disabled={!canEdit}>
        Создать проект
      </button>
      {!canEdit && <p>Роль viewer: создание/редактирование недоступно.</p>}
    </section>
  );
};
