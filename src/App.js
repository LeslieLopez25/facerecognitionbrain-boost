import React, { Component, lazy, Suspense } from "react";
import ParticlesBg from "particles-bg";
import "./App.css";
import Spinner from "./components/Spinner/Spinner";

const FaceRecognition = lazy(() =>
  import("./components/FaceRecognition/FaceRecognition")
);
const Navigation = lazy(() => import("./components/Navigation/Navigation"));
const Logo = lazy(() => import("./components/Logo/Logo"));
const ImageLinkForm = lazy(() =>
  import("./components/ImageLinkForm/ImageLinkForm")
);
const Rank = lazy(() => import("./components/Rank/Rank"));
const SignIn = lazy(() => import("./components/Signin/Signin"));
const Register = lazy(() => import("./components/Register/Register"));
const Modal = lazy(() => import("./components/Modal/Modal"));
const Profile = lazy(() => import("./components/Profile/Profile"));

const initialState = {
  input: "",
  imageUrl: "",
  boxes: [],
  route: "signin",
  isSignedIn: false,
  isProfileOpen: false,
  user: {
    id: "",
    name: "",
    email: "",
    entries: 0,
    joined: "",
    pet: "",
    age: "",
  },
};

class App extends Component {
  constructor() {
    super();
    this.state = initialState;
  }

  componentDidMount() {
    const token = sessionStorage.getItem("token");
    if (token) {
      fetch("http://localhost:3000/signin", {
        method: "post",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      })
        .then((resp) => resp.json())
        .then((data) => {
          if (data && data.id) {
            fetch(`http://localhost:3000/profile/${data.id}`, {
              method: "get",
              headers: {
                "Content-Type": "application/json",
                Authorization: token,
              },
            })
              .then((resp) => resp.json())
              .then((user) => {
                if (user && user.email) {
                  this.loadUser(user);
                  this.onRouteChange("home");
                }
              });
          }
        })
        .catch(console.log);
    }
  }

  loadUser = (data) => {
    this.setState({
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
        entries: data.entries,
        joined: data.joined,
        age: data.age,
        pet: data.pet,
      },
    });
  };

  calculateFaceLocation = (data) => {
    if (data && data.outputs) {
      const image = document.getElementById("inputimage");
      const width = Number(image.width);
      const height = Number(image.height);
      return data.outputs[0].data.regions.map((face) => {
        const clarifaiFace = face.region_info.bounding_box;
        return {
          leftCol: clarifaiFace.left_col * width,
          topRow: clarifaiFace.top_row * height,
          rightCol: width - clarifaiFace.right_col * width,
          bottomRow: height - clarifaiFace.bottom_row * height,
        };
      });
    }
    return;
  };

  displayFaceBox = (boxes) => {
    if (boxes) {
      this.setState({ boxes: boxes });
    }
  };

  onInputChange = (event) => {
    this.setState({ input: event.target.value });
  };

  onButtonSubmit = () => {
    this.setState({
      imageUrl: this.state.input,
    });
    fetch("http://localhost:3000/imageurl", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: sessionStorage.getItem("token"),
      },
      body: JSON.stringify({
        input: this.state.input,
      }),
    })
      .then((response) => response.json())
      .then((response) => {
        if (response) {
          fetch("http://localhost:3000/image", {
            method: "put",
            headers: {
              "Content-Type": "application/json",
              Authorization: sessionStorage.getItem("token"),
            },
            body: JSON.stringify({
              id: this.state.user.id,
            }),
          })
            .then((response) => response.json())
            .then((count) => {
              this.setState(Object.assign(this.state.user, { entries: count }));
            })
            .catch(console.log);
        }
        this.displayFaceBox(this.calculateFaceLocation(response));
      })
      .catch((err) => console.log(err));
  };

  removeSessionToken = () => {
    window.sessionStorage.removeItem("token");
  };

  onRouteChange = (route) => {
    if (route === "signout") {
      fetch("http://localhost:3000/signout", {
        method: "delete",
        headers: {
          "Content-Type": "application/json",
          Authorization: window.sessionStorage.getItem("token"),
        },
      });
      this.removeSessionToken();
      return this.setState(initialState);
    } else if (route === "home") {
      this.setState({ isSignedIn: true });
    }
    this.setState({ route: route });
  };

  toggleModal = () => {
    this.setState((prevState) => ({
      ...prevState,
      isProfileOpen: !prevState.isProfileOpen,
    }));
  };

  render() {
    const { isSignedIn, imageUrl, route, boxes, isProfileOpen, user } =
      this.state;

    return (
      <div className="App">
        <ParticlesBg
          class="particles-bg-canvas-self"
          type="thick"
          bg={{
            position: "fixed",
            height: "100%",
            width: "100%",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: -1,
          }}
        />
        <Suspense
          fallback={
            <div>
              <Spinner />
            </div>
          }
        >
          <Navigation
            isSignedIn={isSignedIn}
            onRouteChange={this.onRouteChange}
            toggleModal={this.toggleModal}
          />
          {isProfileOpen && (
            <Modal>
              <Profile
                isProfileOpen={isProfileOpen}
                toggleModal={this.toggleModal}
                loadUser={this.loadUser}
                user={user}
              />
            </Modal>
          )}
          {route === "home" ? (
            <div>
              <Logo />

              <Rank
                name={this.state.user.name}
                entries={this.state.user.entries}
              />
              <ImageLinkForm
                onInputChange={this.onInputChange}
                onButtonSubmit={this.onButtonSubmit}
              />
              <FaceRecognition boxes={boxes} imageUrl={imageUrl} />
            </div>
          ) : route === "signin" ? (
            <SignIn
              loadUser={this.loadUser}
              onRouteChange={this.onRouteChange}
            />
          ) : (
            <Register
              loadUser={this.loadUser}
              onRouteChange={this.onRouteChange}
            />
          )}
        </Suspense>
      </div>
    );
  }
}

export default App;
