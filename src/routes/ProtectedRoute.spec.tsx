import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { setAccessToken } from '@/utils/authStorage';
import { ProtectedRoute } from './ProtectedRoute';

function renderProtectedRoute() {
  render(
    <MemoryRouter initialEntries={['/private']}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/private" element={<div>Private content</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects anonymous users to login', () => {
    renderProtectedRoute();
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders protected content for a session with an access token', () => {
    setAccessToken('access-token');
    renderProtectedRoute();
    expect(screen.getByText('Private content')).toBeInTheDocument();
  });
});
