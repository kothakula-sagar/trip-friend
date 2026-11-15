export default Object.freeze({
  project: 'trip-friend-bd675',
  origins: ['https://kothakula-sagar.github.io','https://localhost'],
  issuerBase: 'https://securetoken.google.com/',
  jwks: 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  oauth: 'https://oauth2.googleapis.com/token',
  firestore: 'https://firestore.googleapis.com/v1',
  datastoreScope: 'https://www.googleapis.com/auth/datastore',
  accountSecret: 'FIREBASE_SERVICE_ACCOUNT_JSON',
  uidRequests: 20,
  intervalSeconds: 60
});
