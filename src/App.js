/* eslint-disable object-curly-newline */
import React from 'react';
import { create } from '@arcblock/ux/lib/Theme';
import { MuiThemeProvider } from '@material-ui/core/styles';
import { createGlobalStyle, ThemeProvider } from 'styled-components';
import { BrowserRouter as Router, Route, Switch, Redirect, withRouter } from 'react-router-dom';

import CssBaseline from '@material-ui/core/CssBaseline';
import CircularProgress from '@material-ui/core/CircularProgress';
import Center from '@arcblock/ux/lib/Center';

import HomePage from './pages/index';
import ProfilePage from './pages/profile';
import CreateContractPage from './pages/contracts/create';
import ViewContractPage from './pages/contracts/detail';

import { SessionProvider } from './libs/session';

const theme = create({ typography: { fontSize: 14 } });

const GlobalStyle = createGlobalStyle`
  a {
    color: ${props => props.theme.colors.green};
    text-decoration: none;
  }

  ul, li {
    padding: 0;
    margin: 0;
    list-style: none;
  }
`;

export const App = () => (
  <MuiThemeProvider theme={theme}>
    <ThemeProvider theme={theme}>
      <SessionProvider serviceHost="" autoLogin>
        {({ session }) => {
          if (session.loading) {
            return (
              <Center>
                <CircularProgress />
              </Center>
            );
          }

          return (
            <React.Fragment>
              <CssBaseline />
              <GlobalStyle />
              <div className="wrapper">
                <Switch>
                  <Route exact path="/" component={HomePage} />
                  <Route exact path="/profile" component={ProfilePage} />
                  <Route exact path="/contracts/create" component={CreateContractPage} />
                  <Route exact path="/contracts/detail" component={ViewContractPage} />
                  <Redirect to="/" />
                </Switch>
              </div>
            </React.Fragment>
          );
        }}
      </SessionProvider>
    </ThemeProvider>
  </MuiThemeProvider>
);

const WrappedApp = withRouter(App);

export default () => (
  <Router>
    <WrappedApp />
  </Router>
);
