import firebase from 'firebase';
import { createStackNavigator } from 'react-navigation';
import { FIREBASE } from './env';
import TodayTasksScreen from './src/screens/TodayTasksScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SettingScreen from './src/screens/SettingScreen';
import HistoryScreen from './src/screens/HistoryScreen';

require('firebase/firestore');

const ENV = FIREBASE;
const config = {
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: ENV.FIREBASE_AUTH_DOMAIN,
  databaseURL: ENV.FIREBASE_DB_URL,
  projectId: ENV.FIREBASE_PRJ_ID,
  storageBucket: ENV.FIREBASE_STORAGE,
  messagingSenderId: ENV.FIREBASE_SENDER_ID
};
firebase.initializeApp(config);

const App = createStackNavigator(
  {
    // Login: { screen: LoginScreen },
    Dashboard: { screen: DashboardScreen },
    TodayTasks: { screen: TodayTasksScreen },
    Setting: { screen: SettingScreen },
    History: { screen: HistoryScreen }
    // Signup: { screen: SignupScreen },
    // Home: { screen: MemoListScreen },
    // MemoDetail: { screen: MemoDetailScreen },
    // MemoEdit: { screen: MemoEditScreen },
    // MemoCreate: { screen: MemoCreateScreen }
  },
  {
    navigationOptions: {
      headerTitle: 'baton',
      headerTintColor: '#fff',
      headerBackTitle: null,
      headerStyle: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        backgroundColor: '#265366'
      },
      headerTitleStyle: {
        color: '#fff'
      }
    }
  }
);

export default App;
