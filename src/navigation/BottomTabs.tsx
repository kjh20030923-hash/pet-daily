import React from 'react';
import { CommonActions, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, AppIconName } from '../components/AppIcon';
import { CheckInScreen } from '../screens/CheckInScreen';
import { ExpensesScreen } from '../screens/ExpensesScreen';
import { HealthCenterScreen } from '../screens/HealthCenterScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { colors } from '../theme';

export type RootTabParamList = {
  Home: { quickAddToken?: number } | undefined;
  Expenses: undefined;
  Health: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background } };

const iconMap: Record<keyof RootTabParamList, AppIconName> = {
  Home: 'home',
  Expenses: 'expense',
  Health: 'health',
  Profile: 'profile',
};

const labelMap: Record<keyof RootTabParamList, string> = {
  Home: '首页',
  Expenses: '记录',
  Health: '健康',
  Profile: '我的',
};

const FloatingTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const bottomOffset = insets.bottom + 16;
  const renderTab = (routeIndex: number) => {
    const route = state.routes[routeIndex];
    const routeName = route.name as keyof RootTabParamList;
    const focused = state.index === routeIndex;
    const color = focused ? colors.textPrimary : colors.textMuted;
    const options = descriptors[route.key].options;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        navigation.dispatch(CommonActions.navigate({ name: route.name, params: route.params }));
      }
    };

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarButtonTestID}
        onPress={onPress}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
      >
        <View style={styles.iconWrap}>
          <AppIcon name={iconMap[routeName]} size="small" tint={color} />
          {focused ? <View style={styles.activeAccent} /> : null}
        </View>
        <Text style={[styles.tabLabel, { color }]}>{labelMap[routeName]}</Text>
      </Pressable>
    );
  };

  const openQuickAdd = () => {
    navigation.dispatch(CommonActions.navigate({ name: 'Home', params: { quickAddToken: Date.now() } }));
  };

  return (
    <View pointerEvents="box-none" style={[styles.barArea, { height: 65 + bottomOffset }]}> 
      <View style={[styles.pill, { bottom: bottomOffset }]}> 
        <View style={styles.sideGroup}>{renderTab(0)}{renderTab(1)}</View>
        <View style={styles.centerSlot} />
        <View style={styles.sideGroup}>{renderTab(2)}{renderTab(3)}</View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="添加记录"
        onPress={openQuickAdd}
        style={({ pressed }) => [styles.fab, { bottom: bottomOffset + 65 - 41 }, pressed && styles.fabPressed]}
      >
        <Text style={styles.fabPlus}>＋</Text>
      </Pressable>
    </View>
  );
};

export const BottomTabs: React.FC = () => (
  <NavigationContainer theme={navTheme}>
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
    >
      <Tab.Screen name="Home" component={CheckInScreen} options={{ tabBarLabel: '首页' }} />
      <Tab.Screen name="Expenses" component={ExpensesScreen} options={{ tabBarLabel: '记录' }} />
      <Tab.Screen name="Health" component={HealthCenterScreen} options={{ tabBarLabel: '健康' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: '我的' }} />
    </Tab.Navigator>
  </NavigationContainer>
);

const styles = StyleSheet.create({
  barArea: { backgroundColor: 'transparent', overflow: 'visible' },
  pill: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 65,
    borderRadius: 40,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: colors.borderSoft,
  },
  sideGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  centerSlot: { width: 64 },
  tabItem: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center' },
  tabItemPressed: { opacity: 0.62 },
  iconWrap: { height: 30, alignItems: 'center', justifyContent: 'center' },
  activeAccent: { position: 'absolute', bottom: -1, width: 13, height: 3, borderRadius: 2, backgroundColor: '#C39B78' },
  tabLabel: { marginTop: 2, fontSize: 11, fontWeight: '500' },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentStrong,
    borderWidth: 3,
    borderColor: colors.background,
    shadowColor: colors.accentStrong,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  fabPressed: { transform: [{ scale: 0.94 }], opacity: 0.9 },
  fabPlus: { marginTop: -2, color: '#FFFFFF', fontSize: 28, lineHeight: 32, fontWeight: '400' },
});

export default BottomTabs;
