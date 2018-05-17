import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  TouchableHighlight,
  TouchableOpacity,
  Text,
  ScrollView,
  Dimensions
} from 'react-native';
import {FileSystem, FaceDetector, MediaLibrary, Permissions} from 'expo';
import {FontAwesome} from '@expo/vector-icons';
import {Video} from 'expo';

const pictureSize = 150;

export default class GalleryScreen extends React.Component {
  state = {
    faces: {},
    images: {},
    photos: [],
    playSource: false
  };
  _mounted = false;

  componentDidMount() {
    this._mounted = true;
    FileSystem.readDirectoryAsync(FileSystem.documentDirectory + 'photos').then(photos => {
      if (this._mounted) {
        const selected = false;
        photos = photos.map(uri => ({uri, selected}));
        console.log('list photos', photos);
        this.setState(
          {
            photos,
          },
          this.detectFaces
        );
      }
    });
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  getImageDimensions = ({width, height}) => {
    if (width > height) {
      const scaledHeight = pictureSize * height / width;
      return {
        width: pictureSize,
        height: scaledHeight,

        scaleX: pictureSize / width,
        scaleY: scaledHeight / height,

        offsetX: 0,
        offsetY: (pictureSize - scaledHeight) / 2,
      };
    } else {
      const scaledWidth = pictureSize * width / height;
      return {
        width: scaledWidth,
        height: pictureSize,

        scaleX: scaledWidth / width,
        scaleY: pictureSize / height,

        offsetX: (pictureSize - scaledWidth) / 2,
        offsetY: 0,
      };
    }
  };

  saveToGallery = async () => {
    const {photos} = this.state;

    if (photos.length > 0) {
      const {status} = await Permissions.askAsync(Permissions.CAMERA_ROLL);

      if (status !== 'granted') {
        throw new Error('Denied CAMERA_ROLL permissions!');
      }

      const promises = photos.map(photo => {
        return MediaLibrary.createAssetAsync(`${FileSystem.documentDirectory}photos/${photo.uri}`)
      });

      await Promise.all(promises);
      alert('Successfully saved photos to user\'s gallery!');
    } else {
      alert('No photos to save!');
    }
  };

  clearGallery = async () => {
    const {photos} = this.state;

    if (photos.length > 0) {

      const promises = photos.map(photo => {
        return FileSystem.deleteAsync(`${FileSystem.documentDirectory}photos/${photo.uri}`)
      });

      await Promise.all(promises);
      alert('Successfully deleted temporary photos!');
    } else {
      alert('No element to delete!');
    }
  };

  detectFaces = () => {
    return "";
    //return this.state.photos.map(p=>p.uri).forEach(this.detectFace);
  }

  detectFace = photo =>
    (photo.indexOf('photo') !== -1) && FaceDetector.detectFacesAsync(`${FileSystem.documentDirectory}photos/${photo}`, {
      detectLandmarks: FaceDetector.Constants.Landmarks.none,
      runClassifications: FaceDetector.Constants.Classifications.all,
    })
      .then(this.facesDetected)
      .catch(this.handleFaceDetectionError);

  facesDetected = ({image, faces}) => {
    if (!this._mounted) return;
    this.setState({
      faces: {...this.state.faces, [image.uri]: faces},
      images: {...this.state.images, [image.uri]: image},
    });
  }

  handleFaceDetectionError = error => console.warn(error);

  renderFaces = photoUri =>
    this.state.images[photoUri] &&
    this.state.faces[photoUri] &&
    this.state.faces[photoUri].map(this.renderFace(this.state.images[photoUri]));

  renderFace = image => (face, index) => {
    const {scaleX, scaleY, offsetX, offsetY} = this.getImageDimensions(image);
    const layout = {
      top: offsetY + face.bounds.origin.y * scaleY,
      left: offsetX + face.bounds.origin.x * scaleX,
      width: face.bounds.size.width * scaleX,
      height: face.bounds.size.height * scaleY,
    };

    return (
      <View
        key={index}
        style={[styles.face, layout]}
        transform={[
          {perspective: 600},
          {rotateZ: `${(face.rollAngle || 0).toFixed(0)}deg`},
          {rotateY: `${(face.yawAngle || 0).toFixed(0)}deg`},
        ]}>
        <Text style={styles.faceText}>😁 {(face.smilingProbability * 100).toFixed(0)}%</Text>
      </View>
    );
  };

  render() {
    let Icon = FontAwesome; // set FontAwesome as the default icon source
    let icon_name = 'play-circle';
    let icon_color = 'white';
    const {width} = Dimensions.get('window');

    return (
      <View style={styles.container}>
        <View style={styles.navbar}>
          <TouchableOpacity style={styles.button} onPress={this.props.onPress}>
            <Text>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={this.clearGallery}>
            <Text>deletes all shots</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={this.saveToGallery}>
            <Text>Save to phone gallery</Text>
          </TouchableOpacity>
        </View>
        <View style={{
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <ScrollView contentComponentStyle={{flex: 1}}>
            <View style={styles.pictures}>
              {this.state.photos.map(photo => (
                <View style={styles.pictureWrapper} key={photo.uri}>
                  <Image
                    key={photo.uri}
                    style={styles.picture}
                    source={{
                      uri: `${FileSystem.documentDirectory}photos/${photo.uri}`,
                    }}
                  />
                  <View style={{
                    flex: 1,
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}>
                    {
                      (photo.uri.indexOf('Movie') !== -1) &&
                      <TouchableHighlight onPress={() => this.setState({playSource: photo.uri})} activeOpacity={0.50}
                                          underlayColor={"#f1f1f1"}
                                          style={{
                                            flex: 0.5,
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                          }}
                      >
                        <Icon
                          name='play-circle'
                          size={50}
                          color={icon_color}
                        />
                      </TouchableHighlight>
                    }
                    <TouchableHighlight onPress={() => this.setState({playSource: photo.uri})} activeOpacity={0.50}
                                        underlayColor={"#f1f1f1"}
                                        style={{
                                          flex: 0.5,
                                          flexDirection: 'column',
                                          justifyContent: 'center',
                                          alignItems: 'center',
                                        }}
                    >
                      <Icon
                        name='cloud-upload'
                        size={30}
                        color={icon_color}
                      />
                    </TouchableHighlight>

            </View>
            <View style={styles.facesContainer}>
              {this.renderFaces(`${FileSystem.documentDirectory}photos/${photo.uri}`)}
            </View>

        </View>
        ))}
      </View>
    <Text style={styles.faceText}>>
      URI:{this.state.playSource}
    </Text>
  </ScrollView>
  <
    View
    style = {
    {
      flex: 0.25, alignSelf
    :
      'flex-end'
    }
  }>
    {
      this.state.playSource &&
      <Video
        onPlaybackStatusUpdate={(playbackStatus) => (playbackStatus.positionMillis === playbackStatus.durationMillis) && this.setState({playSource: null})}
        source={{uri: `${FileSystem.documentDirectory}photos/${this.state.playSource}`}}
        shouldPlay
        resizeMode="cover"
        style={{bottom: 200, width, height: 300}}
      />
    }
  </View>
  </View>
  </View>
  );
  }
  }

  const styles = StyleSheet.create({
    container: {
    flex: 1,
    paddingTop: 20,
  },
    navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'indianred',
  },
    pictures: {
    flex: 1,
    flexWrap: 'wrap',
    flexDirection: 'row',
  },
    picture: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    top: 0,
    resizeMode: 'contain',
  },
    pictureWrapper: {
    width: pictureSize,
    height: pictureSize,
    margin: 5,
  },
    facesContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    top: 0,
  },
    face: {
    borderWidth: 2,
    borderRadius: 2,
    position: 'absolute',
    borderColor: '#FFD700',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
    faceText: {
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: 2,
    fontSize: 10,
    backgroundColor: 'transparent',
  },
    button: {
    padding: 20,
  },
  });
