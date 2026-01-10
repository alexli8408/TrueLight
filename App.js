import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import CalibrationScreen from './src/screens/CalibrationScreen';
import CameraScreen from './src/screens/CameraScreen';

const Stack = createStackNavigator();

export default function App() {
  const [colorblindnessType, setColorblindnessType] = useState(null);

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Calibration"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2c3e50',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Calibration" 
          options={{ title: 'Colorblindness Calibration' }}
        >
          {props => (
            <CalibrationScreen 
              {...props} 
              onCalibrationComplete={(type) => {
                setColorblindnessType(type);
                props.navigation.navigate('Camera', { colorblindnessType: type });
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen 
          name="Camera" 
          options={{ title: 'Hazard Detection' }}
        >
          {props => <CameraScreen {...props} colorblindnessType={colorblindnessType} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
