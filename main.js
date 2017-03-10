import Expo, { Location, Permissions, Components } from 'expo';
import React from 'react';
import * as firebase from 'firebase';
import {
  StyleSheet,
  Text,
  View,
  Button,
} from 'react-native';

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCBlDh_FTwFsbTKDdiAIRq0CXTV9yCq8kA",
  authDomain: "chaseme-f0fda.firebaseapp.com",
  databaseURL: "https://chaseme-f0fda.firebaseio.com",
  storageBucket: "chaseme-f0fda.appspot.com",
};

firebase.initializeApp(firebaseConfig);

// Get a reference to the database service
var database = firebase.database();

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      courier: false,
      recipientLocation: null,
      courierLocation: null,
      recipient: false,
      recLat: null,
      recLong: null,
      couLat: null,
      couLong: null,
      delivered: false,
    };
    this.map = null;
  }
  componentDidMount() {
    database.ref('recipient').on('value', (snapshot) => {
      let res = snapshot.val();
      if(res && res.lat && res.long) {
        this.setState({
          recipientLocation: {
            latitude: res.lat,
            longitude: res.long,
          },
          recLat: res.lat,
          recLong: res.long,
        });
      }
    });
    database.ref('courier').on('value', (snapshot) => {
      let res = snapshot.val();
      if(res && res.lat && res.long) {
        this.setState({
          courierLocation: {
            latitude: res.lat,
            longitude: res.long,
          },
          couLat: res.lat,
          couLong: res.long,
        });
      }
    });
    database.ref('delivered').on('value', (snapshot) => {
      let res = snapshot.val();
      if(res) {
        this.setState({
          delivered: res,
        });
      }
    });
  }
  updateLocation(obj) {
    if(this.state.recipient) {
      database.ref('recipient').set({
        lat: obj.coords.latitude,
        long: obj.coords.longitude,
      });
    }
    if(this.state.courier) {
      database.ref('courier').set({
        lat: obj.coords.latitude,
        long: obj.coords.longitude,
      });
    }
    // If we can check the two locations to see if
    // they are near each other, we can highlight step 3.
    // otherwise, don't worry about it. Not sure if we need
    // to look into google maps api to get distance between
    // two coordinates, or check the map zoom level?
  }
  componentDidUpdate() {
    this.focusMap();
  }
  focusMap() {
    if(this.map && this.state.recipientLocation && this.state.courierLocation) {
      this.map.fitToSuppliedMarkers(["recipient", "courier"], true);
    }
  }
  async getLocation() {
    const { status } = await Permissions.askAsync(Permissions.LOCATION);
    if(status === 'granted') {
      Location.watchPositionAsync({
        enableHighAccuracy: true,
        timeInterval: 5000,
        distanceInterval: 3,
      }, this.updateLocation.bind(this));
    } else {
      throw new Error('Location permission not granted');
    }
  }
  handleCourier() {
    this.setState({
      courier: true,
    });
    this.getLocation();
  }
  handleRecipient() {
    this.setState({
      recipient: true,
    });
    this.getLocation();
  }
  handleReset() {
    database.ref('courier').remove();
    database.ref('recipient').remove();
    database.ref('delivered').set(false);
  }
  handleDelivered() {
    database.ref('delivered').set(true);
  }
  renderDefault() {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Chase Me</Text>
        <Text style={styles.desc}>Choose a character to play in the chase!</Text>
        <View style={styles.button}>
          <Button
            onPress={() => this.handleCourier()}
            title="Courier"
            color="#1A237E"
            accessibilityLabel="Choose to be the courier in this chase."
          />
        </View>
        <View style={styles.button}>
          <Button
            onPress={() => this.handleRecipient()}
            title="Recipient"
            color="#1A237E"
            accessibilityLabel="Choose to be the courier in this chase."
          />
        </View>
        <View style={styles.resetButton}>
          <Button
            onPress={() => this.handleReset()}
            title="Reset"
            color="#757575"
            accessibilityLabel="Reset the database."
          />
        </View>
      </View>
    );
  }
  renderMap() {
    const recipient = (this.state.recLat && this.state.recLong) ?
      <Components.MapView.Marker
        coordinate={this.state.recipientLocation}
        identifier="recipient"
        title={'User'}
        description={'You are here!'}
      /> : null;
    const courier = (this.state.couLat && this.state.couLong) ?
      <Components.MapView.Marker
        coordinate={this.state.courierLocation}
        identifier="courier"
        title={'User'}
        description={'You are here!'}
      /> : null;
    if(this.state.recLat && this.state.recLong) {
      return (
        <Components.MapView
          initialRegion={{
            latitude: this.state.recLat,
            longitude: this.state.recLong,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          style={styles.map}
          ref={ref => { this.map = ref; }}
        >
          {recipient}
          {courier}
        </Components.MapView>
      );
    }
  }
  renderRecipient() {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Chase Me</Text>
        </View>
        <Text style={styles.activeStep}>1. Your order is being prepared. We will be there in a flash!</Text>
        <Text style={(this.state.delivered || (this.state.recLat && this.state.couLat)) ? styles.activeStep : styles.inactiveStep}>2. Your courrier is on the way. Hold tight!</Text>
        <Text style={(this.state.delivered) ? styles.activeStep : styles.inactiveStep}>3. Your courrier is nearby. Go grab your stuff!</Text>
        {this.renderMap()}
        <Text style={(this.state.delivered) ? styles.activeStep : styles.inactiveStep}>4. Your order was delivered! Thanks!</Text>
      </View>
    )
  }
  renderCourier() {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Chase Me</Text>
        </View>
        <Text style={styles.activeStep}>1. Deliver to the person below!</Text>
        {this.renderMap()}
        <View style={styles.deliveryButton}>
          <Button
            onPress={() => this.handleDelivered()}
            title="Confirm Delivery"
            color="#757575"
            accessibilityLabel="Delivery is done."
          />
        </View>
      </View>
    )
  }
  render() {
    if(!this.state.courier && !this.state.recipient) {
      return this.renderDefault();
    }
    if(this.state.recipient) {
      return this.renderRecipient();
    }
    if(this.state.courier) {
      return this.renderCourier();
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 30,
    paddingBottom: 30,
  },
  headerContainer: {
    marginTop: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#3F51B5',
  },
  button: {
    backgroundColor: '#E0E0E0',
    marginBottom: 20,
    width: 250,
  },
  resetButton: {
    backgroundColor: '#E0E0E0',
    marginTop: 20,
    marginBottom: 20,
    width: 250,
  },
  activeStep: {
    margin: 20,
    fontSize: 16,
    color: '#212121',
  },
  inactiveStep: {
    margin: 20,
    fontSize: 16,
    color: '#BDBDBD',
  },
  desc: {
    marginBottom: 30,
    color: '#212121',
  },
  map: {
    flex: 1,
    margin: 20,
    height: 200,
  },
  deliveryButton: {
    flex: 1,
    margin: 20,
    height: 20,
  }
});



Expo.registerRootComponent(App);
