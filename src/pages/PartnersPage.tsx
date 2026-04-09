import { useAuth } from '../app/AuthContext';

export const PartnersPage = () => {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';

  return (
    <section>
      <h1>Partners</h1>
      <p>Пустая страница MVP.</p>
      <button type="button" disabled={!canEdit}>
        Добавить партнёра
      </button>
      {!canEdit && <p>Роль viewer: редактирование недоступно.</p>}
    </section>
  );
};
