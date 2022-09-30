import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  query,
  child,
  get,
  orderByChild,
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
let user = null;
export const getUser = () => user;

const app = initializeApp(firebaseConfig);
const db = getDatabase(app, firebaseConfig.databaseURL);
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/contacts.readonly');

async function writeUserData(userId, name, imageUrl, score) {
  try {
    await set(ref(db, 'scores/' + userId), {
      username: name,
      score: score,
      profile_picture: imageUrl,
    });
    return true;
  } catch (error) {
    console.error('failed to add score record', error);
  }
}

const auth = getAuth();
auth.useDeviceLanguage();

export const submitScore = async (score) => {
  console.log('submitScore');
  try {
    const result = await signInWithPopup(auth, provider);
    //const credential = GoogleAuthProvider.credentialFromResult(result);
    //const token = credential.accessToken;
    const { uid, displayName, photoURL } = result.user;
    //console.log('auth success', result);
    user = {
      uid,
      displayName,
      photoURL,
    };
    console.log('writing score record', result.user);

    const res = await writeUserData(
      user.uid,
      user.displayName,
      user.photoURL,
      score
    );
    return res;
  } catch (error) {
    console.error('failed to authenticate', error);
    // const errorCode = error.code;
    // const errorMessage = error.message;
    // // The email of the user's account used.
    // const email = error.customData.email;
    // // The AuthCredential type that was used.
    // const credential = GoogleAuthProvider.credentialFromError(error);
  }
};

export const loadScores = async () => {
  const q = query(ref(db, 'scores'), orderByChild('score'));
  //const q = query(child(db, 'scores'), orderByChild('score'), limitToLast(5));
  const res = [];
  const snapshot = await get(q);
  snapshot.forEach((childSnapshot) => {
    res.push(childSnapshot.val());
  });
  return res;
};
