/**
 * Index - Entry Point
 * Redirects to the home screen
 */

import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/home" />;
}
