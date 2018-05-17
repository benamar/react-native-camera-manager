import React from 'react';
import {StyleSheet, Dimensions, Text, View, TouchableOpacity, Slider, Vibration} from 'react-native';
import {Constants, Camera, FileSystem, Permissions} from 'expo';
import GalleryScreen from './GalleryScreen';
import isIPhoneX from 'react-native-is-iphonex';

const landmarkSize = 2;

const flashModeOrder = {
  off: 'on',
  on: 'auto',
  auto: 'torch',
  torch: 'off',
};

const wbOrder = {
  auto: 'sunny',
  sunny: 'cloudy',
  cloudy: 'shadow',
  shadow: 'fluorescent',
  fluorescent: 'incandescent',
  incandescent: 'auto',
};


export default class CameraScreen extends React.Component {
  state = {
    flash: 'off',
    zoom: 0,
    autoFocus: 'on',
    depth: 0,
    type: 'back',
    whiteBalance: 'auto',
    ratio: '16:9',
    ratios: [],
    photoId: 1,
    movieId: 1,
    duration: 0,
    timer: null,
    showGallery: false,
    photos: [],
    faces: [],
    permissionsGranted: false,
  };

  async componentWillMount() {
    const cam = await Permissions.askAsync(Permissions.CAMERA);
    const audio = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
    console.log('cam', cam, 'audio', audio);
    this.setState({permissionsGranted: (cam.status === 'granted' && audio.status === 'granted')});
  }

  async componentDidMount() {
    try {
      const dir = FileSystem.documentDirectory + 'photos';
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (dirInfo.exists && dirInfo.isDirectory) {
        console.log('Directory exists');
        return;
      }
      await FileSystem.makeDirectoryAsync(dir);
    } catch (e) {
      console.error(e);
    }


  }

  getRatios = async () => {
    const ratios = await this.camera.getSupportedRatios();
    return ratios;
  };

  toggleView() {
    this.setState({
      showGallery: !this.state.showGallery,
    });
  }

  toggleFacing() {
    this.setState({
      type: this.state.type === 'back' ? 'front' : 'back',
    });
  }

  toggleFlash() {
    this.setState({
      flash: flashModeOrder[this.state.flash],
    });
  }

  setRatio(ratio) {
    this.setState({
      ratio,
    });
  }

  toggleWB() {
    this.setState({
      whiteBalance: wbOrder[this.state.whiteBalance],
    });
  }

  toggleFocus() {
    this.setState({
      autoFocus: this.state.autoFocus === 'on' ? 'off' : 'on',
    });
  }

  zoomOut() {
    this.setState({
      zoom: this.state.zoom - 0.1 < 0 ? 0 : this.state.zoom - 0.1,
    });
  }

  zoomIn() {
    this.setState({
      zoom: this.state.zoom + 0.1 > 1 ? 1 : this.state.zoom + 0.1,
    });
  }

  setFocusDepth(depth) {
    this.setState({
      depth,
    });
  }

  takePicture = async function () {
    if (this.camera) {
      this.camera.takePictureAsync().then(data => {
        FileSystem.moveAsync({
          from: data.uri,
          to: `${FileSystem.documentDirectory}photos/Photo_${this.state.photoId}.jpg`,
        }).then(() => {
          this.setState({
            photoId: this.state.photoId + 1,
          });
          Vibration.vibrate();
        });
      });
    }
  };

  startRecording = async function () {
    console.log('start recording0');
    if (this.camera) {
      try {
        this.setState({isRecording: true});
        const timer = setInterval(() => {
          this.setState({duration: this.state.duration + 100});
        }, 100);

        this.setState({timer, duration: 0});
        this.camera.recordAsync({quality: '4:3'})
          .then((file) => {
            const path = `${FileSystem.documentDirectory}photos/Movie_${this.state.movieId}.mp4`;
            //this.setState({ movieUrl: file.uri });
            console.log('recording finished saving from', file.uri);
            FileSystem.moveAsync({
              from: file.uri,
              to: path,
            }).then(() => {
              this.setState({
                movieId: this.state.movieId + 1,
              });
              Vibration.vibrate();
            });
          });
      } catch (e) {
        console.log('error in startRecording', e)
      }
    }
  };

  stopRecording() {
    console.log('try stop recording ');
    try {
      this.state.timer && clearInterval(this.state.timer);
      if (this.camera && this.state.isRecording) {
        console.log('calling cam.stopRecording');
        this.camera.stopRecording();
        this.setState({isRecording: false});
      } else {
        console.log('error this.state.isRecording', this.state.isRecording);
        console.log('error this.camera', this.camera);

      }
    } catch (e) {
      console.log('erreur stopping rec', e);
    }
  }

  onFacesDetected = ({faces}) => this.setState({faces});
  onFaceDetectionError = state => console.warn('Faces detection error:', state);

  renderGallery() {
    return <GalleryScreen onPress={this.toggleView.bind(this)}/>;
  }

  renderFace({bounds, faceID, rollAngle, yawAngle}) {
    return (
      <View
        key={faceID}
        transform={[
          {perspective: 600},
          {rotateZ: `${rollAngle.toFixed(0)}deg`},
          {rotateY: `${yawAngle.toFixed(0)}deg`},
        ]}
        style={[
          styles.face,
          {
            ...bounds.size,
            left: bounds.origin.x,
            top: bounds.origin.y,
          },
        ]}>
        <Text style={styles.faceText}>ID: {faceID}</Text>
        <Text style={styles.faceText}>rollAngle: {rollAngle.toFixed(0)}</Text>
        <Text style={styles.faceText}>yawAngle: {yawAngle.toFixed(0)}</Text>
      </View>
    );
  }

  renderLandmarksOfFace(face) {
    const renderLandmark = position =>
      position && (
        <View
          style={[
            styles.landmark,
            {
              left: position.x - landmarkSize / 2,
              top: position.y - landmarkSize / 2,
            },
          ]}
        />
      );
    return (
      <View key={`landmarks-${face.faceID}`}>
        {renderLandmark(face.leftEyePosition)}
        {renderLandmark(face.rightEyePosition)}
        {renderLandmark(face.leftEarPosition)}
        {renderLandmark(face.rightEarPosition)}
        {renderLandmark(face.leftCheekPosition)}
        {renderLandmark(face.rightCheekPosition)}
        {renderLandmark(face.leftMouthPosition)}
        {renderLandmark(face.mouthPosition)}
        {renderLandmark(face.rightMouthPosition)}
        {renderLandmark(face.noseBasePosition)}
        {renderLandmark(face.bottomMouthPosition)}
      </View>
    );
  }

  renderFaces() {
    return (
      <View style={styles.facesContainer} pointerEvents="none">
        {this.state.faces.map(this.renderFace)}
      </View>
    );
  }

  renderLandmarks() {
    return (
      <View style={styles.facesContainer} pointerEvents="none">
        {this.state.faces.map(this.renderLandmarksOfFace)}
      </View>
    );
  }

  renderNoPermissions() {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', padding: 10}}>
        <Text style={{color: 'white'}}>
          Camera permissions not granted - cannot open camera preview.
        </Text>
      </View>
    );
  }

  renderCamera() {
    const {width} = Dimensions.get('window');
    return (
      <Camera
        ref={ref => {
          this.camera = ref;
        }}
        style={{
          flex: 1,
        }}
        type={this.state.type}
        flashMode={this.state.flash}
        autoFocus={this.state.autoFocus}
        zoom={this.state.zoom}
        whiteBalance={this.state.whiteBalance}
        ratio={this.state.ratio}
        faceDetectionLandmarks={Camera.Constants.FaceDetection.Landmarks.all}
        onFacesDetected={this.onFacesDetected}
        onFaceDetectionError={this.onFaceDetectionError}
        focusDepth={this.state.depth}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            flexDirection: 'column',
            justifyContent: 'space-around',
            paddingTop: Constants.statusBarHeight / 2,
          }}>
          <View style={{flex: 1, width, flexDirection: 'row'}}>
            <TouchableOpacity style={[styles.flipButton, {flex: 0.3}]}
                              onPress={this.toggleFacing.bind(this)}>
              <Text style={styles.flipText}> FLIP </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.flipButton, {flex: 0.5}]}
              onPress={this.toggleFlash.bind(this)}>
              <Text style={styles.flipText}> FLASH: {this.state.flash} </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.flipButton, {flex: 0.5}]} onPress={this.toggleWB.bind(this)}>
              <Text style={styles.flipText}> WB: {this.state.whiteBalance} </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.flipButton}
              onPress={this.zoomIn.bind(this)}>
              <Text style={styles.flipText}> + </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={this.zoomOut.bind(this)}>
              <Text style={styles.flipText}> - </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.flipButton, {flex: 0.3}]}
              onPress={this.toggleFocus.bind(this)}>
              <Text style={styles.flipText}> AF : {this.state.autoFocus} </Text>
            </TouchableOpacity>

          </View>


          <View style={{flex: 0.7, flexDirection: 'column'}}>
            {!this.state.isRecording && <TouchableOpacity
              style={[styles.flipButton, styles.galleryButton, {flex: 0.5, alignSelf: 'flex-end'}]}
              onPress={this.startRecording.bind(this)}>
              <Text style={styles.flipText}> start rec. </Text>
            </TouchableOpacity>
            }
            {this.state.isRecording && <TouchableOpacity
              style={[styles.flipButton, styles.galleryButton, {flex: 0.5, alignSelf: 'flex-end'}]}
              onPress={this.stopRecording.bind(this)}>
              <Text style={styles.flipText}> stop rec.. </Text>
              <Text style={styles.flipText}> {this.state.duration}</Text>
            </TouchableOpacity>
            }

            <TouchableOpacity
              style={[styles.flipButton, styles.picButton, {flex: 0.5, alignSelf: 'flex-end'}]}
              onPress={this.takePicture.bind(this)}>
              <Text style={styles.flipText}> SNAP </Text>
            </TouchableOpacity>
          </View>

        </View>
        <View
          style={{
            flex: 0.4,
            backgroundColor: 'transparent',
            flexDirection: 'row',
            alignSelf: 'flex-end',
            marginBottom: -5,
          }}>
          {this.state.autoFocus !== 'on' ? (
            <Slider
              style={{width: 150, marginTop: 15, marginRight: 15, alignSelf: 'flex-end'}}
              onValueChange={this.setFocusDepth.bind(this)}
              step={0.1}
            />
          ) : null}
        </View>
        <View
          style={{
            flex: 0.1,
            paddingBottom: isIPhoneX ? 20 : 0,
            backgroundColor: 'transparent',
            flexDirection: 'row',
            alignSelf: 'flex-end',
          }}>



        </View>
        {this.renderFaces()}
        {this.renderLandmarks()}
      </Camera>
    );
  }

  render() {
    const cameraScreenContent = this.state.permissionsGranted
      ? this.renderCamera()
      : this.renderNoPermissions();
    const content = this.state.showGallery ? this.renderGallery() : cameraScreenContent;
    return <View style={styles.container}>{content}</View>;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  navigation: {
    flex: 1,
  },
  gallery: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  flipButton: {
    flex: 0.2,
    height: 40,
    marginHorizontal: 2,
    marginBottom: 10,
    marginTop: 20,
    borderRadius: 8,
    borderColor: 'white',
    borderWidth: 1,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipText: {
    color: 'white',
    fontSize: 15,
  },
  item: {
    margin: 4,
    backgroundColor: 'indianred',
    height: 35,
    width: 80,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  picButton: {
    backgroundColor: 'darkseagreen',
  },
  galleryButton: {
    backgroundColor: 'indianred',
  },
  facesContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    top: 0,
  },
  face: {
    padding: 10,
    borderWidth: 2,
    borderRadius: 2,
    position: 'absolute',
    borderColor: '#FFD700',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  landmark: {
    width: landmarkSize,
    height: landmarkSize,
    position: 'absolute',
    backgroundColor: 'red',
  },
  faceText: {
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: 10,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
  },
});
