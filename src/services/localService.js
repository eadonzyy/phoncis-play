const USER_KEY = 'phonicsAdventure.localUser';
const PROGRESS_KEY = 'phonicsAdventure.progress';

export async function localGetCurrentUser() {
  const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  return user;
}

export async function localSignUp(email, password) {
  const user = { id: 'local-user', email, provider: 'local' };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function localSignIn(email, password) {
  const user = { id: 'local-user', email, provider: 'local' };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function localSignOut() {
  localStorage.removeItem(USER_KEY);
}

export async function localLoadProgress() {
  return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
}

export async function localSaveProgress(data) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
  return data;
}
