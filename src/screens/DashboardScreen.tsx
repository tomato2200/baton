import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Alert,
  Linking,
  AsyncStorage,
  Button,
  AppState,
  NetInfo,
  AppStateStatus
} from 'react-native';
import Expo, { Svg } from 'expo';
import Modal from 'react-native-modal';
import { Card } from 'react-native-elements';
import firebase from 'firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import format from 'date-fns/format';
import ja from 'date-fns/locale/ja';
import {
  NavigationScreenProp,
  NavigationScreenProps,
  NavigationScreenOptionsGetter,
  NavigationScreenOptions,
  NavigationScreenConfig
} from 'react-navigation';
import { LINK } from '../../env';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#fff'
  },
  inputBox: {
    width: '100%',
    backgroundColor: '#265366',
    paddingVertical: 15,
    paddingHorizontal: 5,
    marginBottom: 10,
    paddingLeft: 15
  },
  inputText: {
    fontSize: 18,
    color: 'white'
  },
  buttonText: {
    padding: 20,
    color: 'white',
    fontSize: 30
  },
  mainBox: {
    marginBottom: 20,
    backgroundColor: '#fff0005c',
    borderRadius: 40,
    borderBottomRightRadius: 10
  },
  mainBoxStart: {
    backgroundColor: 'gray',
    padding: 50,
    borderRadius: 40
  },
  mainText: {
    fontSize: 100,
    color: 'orange',
    textShadowColor: 'pink',
    textShadowOffset: { width: 3, height: 4 },
    textShadowRadius: 3
  },
  mainTextStart: {
    fontSize: 100,
    color: 'white'
  },
  button: {
    backgroundColor: 'lightblue',
    padding: 12,
    margin: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderColor: 'rgba(0, 0, 0, 0.1)'
  },
  modalContent: {
    backgroundColor: 'lightblue',
    paddingBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderColor: 'rgba(0, 0, 0, 0.1)'
  },
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0
  },
  historyButtom: {
    width: 70,
    alignSelf: 'flex-end',
    backgroundColor: '#ffad61',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    height: 25
  }
});

async function firebaseAutha() {
  firebase
    .auth()
    .signInAnonymously()
    .then(() => {
      const { currentUser } = firebase.auth();
      if (currentUser) {
        AsyncStorage.setItem('uid', JSON.stringify(currentUser.uid));
      }
    })
    .catch(error => {
      // Handle Errors here.
      const errorCode = error.code;
      const errorMessage = error.message;
      Alert.alert('エラー');
      // ...
    });
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      // User is signed in.
      const isAnonymous = user.isAnonymous;
      const uid = user.uid;
      const db = firebase.firestore();
      db.settings({ timestampsInSnapshots: true });

      // ...
    } else {
      // User is signed out.
      // ...
    }
    // ...
  });
}

/**
 * AsyncStorage保存先キー
 */
const AS_KEY = {
  // 今日の目標
  TODAY_TITLE: 'todayTitle',
  // 今日の各目標
  TITLE: ['todayFirst', 'todaySecond', 'todayThird']
};

export interface TitleData {
  todayTitle: todayTitle;
  complete: Complete;
  createOn: Date;
  date: string;
}

interface todayTitle {
  [key: string]: string;
}

interface Complete {
  [key: string]: boolean;
}

interface Ongoing {
  date: number;
  saveDate: string;
  isCal: boolean | null;
}

interface limitHour {
  startTime: number;
  endTime: number;
}

interface Baton {
  today: number;
  all: number;
}

interface State {
  [key: string]: any;
  appState: AppStateStatus;
  uid: string;
  data: TitleData[];
  isTodayData: boolean;
  isGetData: boolean;
  isLoading: boolean;
  visibleModal: boolean | null;
  todayTitle: todayTitle;
  complete: Complete;
  ongoing: Ongoing;
  limitHour: limitHour;
  baton: Baton;
}

export interface Props {
  navigation: NavigationScreenProp<any, any>;
}

export interface NavigationLeafRoute<Params> {
  // ...
  /**
   * Params passed to this route when navigating to it,
   * e.g. `{ car_id: 123 }` in a route that displays a car.
   */
  params?: undefined;
}

class DashboardScreen extends React.Component<Props, State> {
  static navigationOptions: NavigationScreenConfig<NavigationScreenOptions> = ({ navigation }) => ({
    headerTitle: 'バトンチャレンジ！',
    headerRight: (
      <View style={{ backgroundColor: 'white', marginEnd: 5, borderRadius: 5 }}>
        <Button
          onPress={() => {
            if (navigation.state.params) {
              navigation.navigate('Setting', {
                updateState: navigation.state.params.setting
              });
            }
          }}
          title="設定"
        />
      </View>
    )
  });

  constructor(props: Props) {
    super(props);
    // androidのタイマー不具合非表示（対策がないため）
    console.ignoredYellowBox = ['Setting a timer'];
  }

  state: State = {
    appState: AppState.currentState,
    uid: '',
    data: [],
    isTodayData: false,
    isGetData: false,
    isLoading: true,
    visibleModal: false,
    todayTitle: {
      [AS_KEY.TITLE[0]]: '',
      [AS_KEY.TITLE[1]]: '',
      [AS_KEY.TITLE[2]]: ''
    },
    complete: {
      [AS_KEY.TITLE[0]]: false,
      [AS_KEY.TITLE[1]]: false,
      [AS_KEY.TITLE[2]]: false
    },
    ongoing: {
      date: 0,
      saveDate: '',
      isCal: null
    },
    limitHour: {
      startTime: 18,
      endTime: 3
    },
    baton: {
      today: 0,
      all: 0
    }
  };

  /**
   * 画面が描画前に実行
   * 描画は全て処理が終わったからになるのでローディング設定がいる
   */
  componentDidMount() {
    // const { currentUser } = firebase.auth();
    // console.warn(currentUser);
    // // this.setState({ uid: currentUser.uid });
    // if (!currentUser) {
    //   this.firebaseAuth();
    // }
    // for debug
    // Expo.SecureStore.deleteItemAsync('uid');
    // Expo.SecureStore.getItemAsync('uid').then(uid => {
    //   if (uid) {
    //     this.setState({ uid });
    //   } else {
    //     this.firebaseAuth();
    //   }
    // });
    this.firebaseAuth();
    this.getLocalData();
    // pramasに関数をセット
    const { navigation } = this.props;
    navigation.setParams({
      setting: (key: string, value: object) => this.updateState(key, value)
    });
    // アプリのアクティブ、非アクティブをキャッチ
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  componentWillUnmount() {
    // アプリのアクティブ、非アクティブをキャッチ
    AppState.removeEventListener('change', this.handleAppStateChange);
  }

  /**
   * 目標達成完了トグルメソッド
   * @param {number} index 目標のインデックス
   */
  onPressButton(index: number) {
    const { complete, baton } = this.state;
    const { TITLE } = AS_KEY;
    complete[TITLE[index]] = !complete[TITLE[index]];
    if (complete[TITLE[index]]) {
      baton.today += 1;
    } else {
      baton.today -= 1;
    }
    this.setState({ complete, baton });
    AsyncStorage.setItem('complete', JSON.stringify(complete));
    AsyncStorage.setItem('baton', JSON.stringify(baton));
  }

  /**
   * 継続日数をAsyncStorageから取得
   * 最後の目標達成日から1.5日過ぎてればリセット
   */
  getLocalData() {
    let { todayTitle } = this.state;
    AsyncStorage.getItem('ongoing').then(value => {
      if (value) {
        const ongoing = JSON.parse(value);
        const saveDate = new Date(ongoing.saveDate).getTime();
        const nowDate = new Date().getTime();
        const df = nowDate - saveDate;
        if (df / 1000 / 60 / 60 / 24 > 1.5) {
          ongoing.date = 0;
          todayTitle = {
            [AS_KEY.TITLE[0]]: '',
            [AS_KEY.TITLE[1]]: '',
            [AS_KEY.TITLE[2]]: ''
          };
          this.setState({ todayTitle });
        }
        this.setState({ ongoing });
      }
    });
    AsyncStorage.getItem('baton').then(value => {
      if (value) {
        const baton = JSON.parse(value);
        this.setState({ baton });
      }
    });
    AsyncStorage.getItem('complete').then(value => {
      if (value) {
        const complete = JSON.parse(value);
        this.setState({ complete });
      }
    });
    AsyncStorage.getItem('limitHour').then(value => {
      if (value) {
        const limitHour = JSON.parse(value);
        this.setState({ limitHour });
      }
    });
    AsyncStorage.getItem('data').then(value => {
      if (value) {
        const data = JSON.parse(value);
        this.setState({ data });
      }
    });
  }

  /**
   *今日の目標をAsyncStorageから取得
   *
   * @memberof DashboardScreen
   */
  setTodayTitle() {
    // for debug
    // AsyncStorage.clear();
    AsyncStorage.getItem(AS_KEY.TODAY_TITLE).then(value => {
      this.setState({
        isGetData: true
      });
      if (value) {
        const { todayTitle } = JSON.parse(value);
        this.setState({
          isTodayData: true,
          todayTitle
        });
      }
    });
  }

  /**
   * AppState.currentStateの変化イベントで呼ばれるメソッド
   */
  handleAppStateChange = (nextAppState: AppStateStatus) => {
    const { appState } = this.state;
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // console.warn('App has come to the foreground!');
    }
    this.setState({ appState: nextAppState });
  };

  /**
   * firebase匿名アカウント作成（初回のみ）
   */
  async firebaseAuth() {
    firebase
      .auth()
      .signInAnonymously()
      .then(currentUser => {
        // console.warn('firebase');
        const { user } = currentUser;
        if (user) {
          this.setState({ uid: user.uid });
        }
      })
      .catch(error => {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        // console.warn(errorCode);
        // console.warn(errorMessage);
        Alert.alert('エラー');
        // ...
      });
  }

  /**
   * stateを更新するメソッド
   * ナビゲーションに渡して遷移先でここのstateを更新する
   * @param {string} key stateのキー
   * @param {any} value 格納する値
   */
  updateState(key: string, value: any) {
    this.setState({ [key]: value });
  }

  /**
   *モーダルコンテンツ
   *
   * @memberof DashboardScreen
   */
  renderModalContent = () => (
    <View style={styles.modalContent}>
      <Card title="Sponsored Link">
        <Text>目標達成サポート商品</Text>
        <Text>PotencialSecret~潜在意識活用マニュアル~は必要ですか？</Text>
        <Text>やる気が出ないのは潜在意識が邪魔しているせいかも・・・</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          {this.renderButton('必要ない', () => {
            const { navigation } = this.props;
            this.setState({ visibleModal: null });
            navigation.navigate('TodayTasks', {
              updateState: (key: string, value: any) => this.updateState(key, value),
              resetComplete: () => this.resetComplete()
            });
          })}
          {this.renderButton('必要かも', () => {
            this.setState({ visibleModal: null });
            Linking.openURL(LINK.GOODS);
          })}
        </View>
      </Card>
    </View>
  );

  /**
   *モーダルフッターボタンエレメント
   *
   * @memberof DashboardScreen
   */
  renderButton = (text: string, onPress: () => void) => (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.button}>
        <Text>{text}</Text>
      </View>
    </TouchableOpacity>
  );

  /**
   * 各目標表示
   *
   * @param {*} title 各目標
   * @returns 各目標表示エレメント
   * @memberof DashboardScreen
   */
  todayTitleGenerator(index: number) {
    const { TITLE } = AS_KEY;
    const { inputBox } = styles;
    const { complete } = this.state;
    let color = '#265366';
    if (complete[TITLE[index]]) {
      color = '#DDD';
    }
    return (
      <TouchableOpacity onPress={() => this.onPressButton(index)}>
        <View style={[inputBox, { backgroundColor: color }]}>
          {this.toggleCheakMark(TITLE[index])}
        </View>
      </TouchableOpacity>
    );
  }

  /**
   * タスクコンプリートプロパティを初期化
   */
  resetComplete() {
    let { complete } = this.state;
    const { baton } = this.state;
    complete = {
      [AS_KEY.TITLE[0]]: false,
      [AS_KEY.TITLE[1]]: false,
      [AS_KEY.TITLE[2]]: false
    };
    baton.today = 0;
    this.setState({ complete, baton });
    AsyncStorage.setItem('complete', JSON.stringify(complete));
    AsyncStorage.setItem('baton', JSON.stringify(baton));
  }

  /**
   * 完了マークをプッシュ判定し、目標エレメント作成
   * @param {string} key completeのキー
   */
  toggleCheakMark(key: string) {
    const { todayTitle, complete } = this.state;
    if (complete[key]) {
      return (
        <Text style={styles.inputText}>
          <Icon name="check-circle" size={25} color="#265366" />
          &nbsp;&nbsp;
          {todayTitle[key]}
        </Text>
      );
    }
    return <Text style={styles.inputText}>{todayTitle[key]}</Text>;
  }

  /**
   * 今日の達成度を計算(未使用)
   */
  calTodayComp() {
    const { complete, baton } = this.state;
    Object.keys(complete).forEach(key => {
      if (complete[key]) {
        baton.today += 1;
      }
    });
    this.setState({ baton });
  }

  /**
   * 今日の達成をAsyncStorageに保存する
   */
  todaySummary() {
    const { ongoing, baton } = this.state;
    ongoing.isCal = true;
    if (baton.today > 0) {
      ongoing.date += 1;
      ongoing.saveDate = new Date().toLocaleString('ja');
      baton.all += baton.today;
      AsyncStorage.setItem('baton', JSON.stringify(baton));
    } else {
      ongoing.date = 0;
    }
    this.setState({ ongoing, baton });
    AsyncStorage.setItem('ongoing', JSON.stringify(ongoing));
    this.pushFirebase();
  }

  /**
   * 達成度登録の際にFirebaseに今日のタスク達成情報を追加
   */
  pushFirebase() {
    const db = firebase.firestore();
    const { currentUser } = firebase.auth();
    const { uid, todayTitle, complete, limitHour, data } = this.state;
    // if (uid !== currentUser.uid) {
    //   Alert.alert(
    //     'エラーが発生し、アプリが正しく動作できませんでした。お手数お掛け致しますが、この画面をスクショしてお送りください。'
    //   );
    // }
    const now = new Date();
    const nowHour = Number(format(now, 'HH'));
    if (nowHour <= limitHour.endTime) {
      now.setDate(now.getDate() - 1);
    }
    const date = `${format(now, 'YYYY')}年 ${format(now, 'MMM Do dddd', { locale: ja })}`;
    NetInfo.getConnectionInfo().then(connectionInfo => {
      // console.warn(connectionInfo.type);
      if (connectionInfo.type === 'none') {
        // console.warn(JSON.stringify(data));
        data.unshift({
          todayTitle,
          complete,
          createOn: new Date(),
          date
        });
        // console.warn(data);
        AsyncStorage.setItem('data', JSON.stringify(data));
        this.setState({ data });
      } else {
        db.settings({ timestampsInSnapshots: true });
        if (currentUser) {
          db.collection(`users/${currentUser.uid}/todayTitle`)
            .add({
              todayTitle,
              complete,
              createOn: new Date(),
              date
            })
            .then(() => {
              // this.props.navigation.goBack();
            })
            .catch(error => {
              // 登録できなかった時に実行
            });
        }
      }
    });
  }

  /**
   * バトンジェネレーター
   */
  generatorBatonElement() {
    const { baton } = this.state;
    const { Path, G } = Svg;
    const elements = [];
    for (let i = 0; i < baton.today; i += 1) {
      elements.push(
        <View key={i} style={{ width: '30%' }}>
          <Svg width={70} height={70} viewBox="-35 -35 100 100">
            <G rotate="0" scale="0.4" fill="#34C8FF">
              <Path d="M58.3,31L46.1,18.8c0-4,4.1-8,8-8L66.3,23L58.3,31z M101,82c9.8-1.6,14.7-6.5,16.3-16.3L55.2,3.6  c-9.8,1.6-14.7,6.5-16.3,16.3L101,82z M74.1-13.6c-2.8-1.6-2.8-1.6-4.4,1.2L68-9.6c-1.6,2.9-1.6,2.9,1.2,4.5L72-3.4  c2.8,1.6,2.8,1.6,4.4-1.2l1.6-2.8c1.6-2.8,1.6-2.8-1.2-4.4L74.1-13.6z M91.8,16.3h-3.3c-3.3,0-3.3,0-3.3,3.3v3.3  c0,3.3,0,3.3,3.3,3.3h3.3c3.3,0,3.3,0,3.3-3.3v-3.3C95.1,16.3,95.1,16.3,91.8,16.3z M57.5-18h-3.3C51-18,51-18,51-14.7v3.3  c0,3.3,0,3.3,3.3,3.3h3.3c3.3,0,3.3,0,3.3-3.3v-3.3C60.8-18,60.8-18,57.5-18z M37.7-13.6l-2.9,1.6c-2.8,1.6-2.8,1.6-1.2,4.4l1.6,2.8  c1.6,2.9,1.6,2.9,4.4,1.2l2.9-1.6c2.8-1.6,2.8-1.6,1.2-4.5l-1.6-2.8C40.5-15.2,40.5-15.2,37.7-13.6z M27.2-1  c-2.8-1.6-2.8-1.6-4.4,1.2L21.1,3c-1.6,2.8-1.6,2.8,1.2,4.4l2.8,1.6c2.9,1.6,2.9,1.6,4.5-1.2l1.6-2.9c1.6-2.8,1.6-2.8-1.2-4.4  L27.2-1z M23.2,16.3h-3.3c-3.3,0-3.3,0-3.3,3.3v3.3c0,3.3,0,3.3,3.3,3.3h3.3c3.3,0,3.3,0,3.3-3.3v-3.3  C26.5,16.3,26.5,16.3,23.2,16.3z M57.5,50.6h-3.3c-3.3,0-3.3,0-3.3,3.3v3.3c0,3.3,0,3.3,3.3,3.3h3.3c3.3,0,3.3,0,3.3-3.3v-3.3  C60.8,50.6,60.8,50.6,57.5,50.6z M25.1,33.3l-2.8,1.6c-2.8,1.6-2.8,1.6-1.2,4.4l1.6,2.9c1.6,2.8,1.6,2.8,4.4,1.2l2.8-1.6  c2.9-1.6,2.9-1.6,1.2-4.4l-1.6-2.9C28,31.7,28,31.7,25.1,33.3z M39.7,45.9c-2.8-1.6-2.8-1.6-4.4,1.2l-1.6,2.8  c-1.6,2.8-1.6,2.8,1.2,4.4l2.9,1.6c2.8,1.6,2.8,1.6,4.4-1.2l1.6-2.8c1.6-2.9,1.6-2.9-1.2-4.5L39.7,45.9z M84.6-1l-2.8,1.6  c-2.9,1.6-2.9,1.6-1.2,4.4l1.6,2.9c1.6,2.8,1.6,2.8,4.5,1.2l2.8-1.6c2.8-1.6,2.8-1.6,1.2-4.4L89,0.2C87.4-2.6,87.4-2.6,84.6-1z" />
            </G>
          </Svg>
        </View>
      );
    }
    return <View style={{ flexDirection: 'row', maxWidth: '50%' }}>{elements}</View>;
  }

  /**
   * 目標出力コンテンツ
   *
   * @returns 目標コンテンツ
   * @memberof DashboardScreen
   */
  renderTodayTitleContent() {
    return (
      <View style={{ width: '100%' }}>
        {this.todayTitleGenerator(0)}
        {this.todayTitleGenerator(1)}
        {this.todayTitleGenerator(2)}
      </View>
    );
  }

  /**
   * 明日の目標設定ボタン表示非表示切り替えメソッド
   */
  renderNextTitleContent() {
    const { ongoing } = this.state;
    if (!ongoing.isCal) {
      return (
        <View>
          {this.renderButton('今日の成果を集計', () => {
            this.todaySummary();
          })}
        </View>
      );
    }
    return (
      <View>
        {this.renderButton('明日の目標を設定', () => {
          const { navigation } = this.props;
          navigation.navigate('TodayTasks', {
            updateState: (key: string, value: any) => this.updateState(key, value),
            resetComplete: () => this.resetComplete()
          });
        })}
      </View>
    );
  }

  /**
   *  今日の結果出力
   */
  renderResultContent() {
    const { baton, limitHour, ongoing } = this.state;
    const now = Number(format(new Date(), 'HH'));
    if (
      // 0-4のような深夜帯に設定の時
      (limitHour.startTime <= limitHour.endTime &&
        limitHour.startTime <= now &&
        now < limitHour.endTime) ||
      // 18-4のような場合
      (limitHour.startTime > limitHour.endTime &&
        (now >= limitHour.startTime || now < limitHour.endTime))
    ) {
      if (baton.all > 0 || baton.today > 0) {
        return (
          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between' }}>
            {this.generatorBatonElement()}
            {this.renderNextTitleContent()}
          </View>
        );
      }
      return <View style={{ alignSelf: 'flex-end' }}>{this.renderNextTitleContent()}</View>;
    }
    // 昼間に目標計算フラグを初期化（TODO：昼間開かなかった時。。。）
    if (ongoing.isCal) {
      ongoing.isCal = false;
      this.setState({ ongoing });
      AsyncStorage.setItem('ongoing', JSON.stringify(ongoing));
    }
    return <View style={{ alignSelf: 'flex-start' }}>{this.generatorBatonElement()}</View>;
  }

  /**
   * 達成履歴表示メソッド
   */
  renderHistoryButton = () => (
    <View style={styles.historyButtom}>
      <TouchableOpacity
        onPress={() => {
          const { navigation } = this.props;
          const { data } = this.state;
          navigation.navigate('History', {
            data,
            updateState: (key: string, value: any) => this.updateState(key, value)
          });
        }}
      >
        <View style={{ alignSelf: 'center' }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>達成履歴</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  render() {
    const { height, width } = Dimensions.get('window');
    const { isTodayData, visibleModal, isGetData, ongoing, uid } = this.state;
    // AsyncStorageから今日の目標を取得、取得後にisGetDataはfalseになる
    if (!isGetData) {
      this.setTodayTitle();
    }
    // 今日の目標、取得フラグ
    // true: 目標表示、 false: 目標設定表示
    if (isTodayData) {
      const ongoingDate = `${ongoing.date}日`;
      return (
        <View style={styles.container}>
          {this.renderResultContent()}
          <View style={styles.mainBox}>
            <View>
              <View style={{ padding: 35, paddingBottom: 15 }}>
                <Text style={[styles.mainText, { fontSize: width / 3.8 }]}>{ongoingDate}</Text>
                <Text style={{ fontSize: 20, alignSelf: 'center' }}>継続中</Text>
              </View>
              {uid ? this.renderHistoryButton() : <View style={{ height: 25 }} />}
            </View>
          </View>
          {this.renderTodayTitleContent()}
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <View style={styles.mainBoxStart}>
          <View>
            <Text style={styles.mainTextStart}>0日</Text>
            <Text style={{ fontSize: 40, alignSelf: 'center' }}>継続中</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            this.setState({ visibleModal: true });
          }}
        >
          <View style={styles.button}>
            <Text style={styles.buttonText}>開始</Text>
          </View>
        </TouchableOpacity>
        <Modal
          isVisible={visibleModal === true}
          animationIn="slideInLeft"
          animationOut="slideOutRight"
          onBackdropPress={() => this.setState({ visibleModal: false })}
        >
          {this.renderModalContent()}
        </Modal>
      </View>
    );
  }
}

export default DashboardScreen;
