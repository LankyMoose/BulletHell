import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  query,
  get,
  orderByChild,
  limitToLast,
  child,
} from 'firebase/database';

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: 'AIzaSyD7Oj2sVbRg-cmnOrKYx7JLhwmDBMtu9CQ',
  authDomain: 'project-pewpew.firebaseapp.com',
  projectId: 'project-pewpew',
  storageBucket: 'project-pewpew.appspot.com',
  messagingSenderId: '252052100176',
  appId: '1:252052100176:web:c6e5f71bd901e462bced55',
  databaseURL: `https://project-pewpew-default-rtdb.asia-southeast1.firebasedatabase.app`,
};
//https://project-pewpew-default-rtdb.asia-southeast1.firebasedatabase.app
//UserCredential.user
export const userData = {
  user: null,
  topScore: 0,
  subscriptions: [],
  subscribe: (cb) => userData.subscriptions.push(cb),
  clearValue: () => {
    userData.user = null;
    userData.topScore = 0;
    userData.subscriptions.forEach((fn) => fn(userData));
  },
  setValue: (user, score) => {
    userData.user = {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
    userData.topScore = score;
    userData.subscriptions.forEach((fn) => fn(userData));
  },
};
const handleAuthStateChange = async (usr) => {
  if (!usr) return userData.clearValue();
  const score = await loadScore(usr.uid);
  userData.setValue(usr, score);
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app, firebaseConfig.databaseURL);
const provider = new GoogleAuthProvider();
//provider.addScope('https://www.googleapis.com/auth/contacts.readonly');

const auth = getAuth();
auth.useDeviceLanguage();
auth.onAuthStateChanged(handleAuthStateChange);

async function writeUserData(userId, username, profile_picture, score, kills) {
  try {
    await set(ref(db, 'scores/' + userId), {
      username,
      score,
      profile_picture,
    });
    return true;
  } catch (error) {
    console.error('failed to add score record', error);
    return false;
  }
}

export const login = async () => {
  const result = await signInWithPopup(auth, provider);
  if (!result.user) throw new Error('failed to authenticate');
  handleAuthStateChange(result.user);
  return true;
};

export const submitScore = async (score, kills) => {
  try {
    if (isNaN(score)) return false;
    if (!userData.user) await login();

    if (
      score < userData.topScore &&
      !confirm(
        `Are you sure you want to submit this score? It's less than your current top score!`
      )
    )
      return false;

    const success = await writeUserData(
      userData.user.uid,
      userData.user.displayName,
      userData.user.photoURL,
      score,
      kills
    );
    if (success) userData.setValue(userData.user, score);
    return success;
  } catch (error) {
    return false;
  }
};
export const loadScore = async (uid) => {
  const q = query(ref(db, `scores/${uid}`));
  const res = [];
  const snapshot = await get(q);
  snapshot.forEach((childSnapshot) => {
    res.push(childSnapshot.val());
  });
  return res.length > 0 ? res[1] : 0;
};
export const loadScores = async () => {
  const q = query(ref(db, 'scores'), orderByChild('score'), limitToLast(10));
  //const q = query(child(db, 'scores'), orderByChild('score'), limitToLast(5));
  const res = [];
  const snapshot = await get(q);
  snapshot.forEach((childSnapshot) => {
    res.push(childSnapshot.val());
  });
  return res.reverse();
};

export const logout = async () => {
  await auth.signOut();
  userData.clearValue();
};
