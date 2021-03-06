import type { AppProps /*, AppContext */ } from "next/app";
import "../components/slang/slang.css";
import "./_app.css";
import Head from "next/head";
import Page from "../components/Page";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <script
          async
          defer
          data-domain="react-xy-mixer.tone-row.com"
          src="https://plausible.io/js/plausible.js"
        />
      </Head>
      <Page>
        <Component {...pageProps} />
      </Page>
    </>
  );
}

// Only uncomment this method if you have blocking data requirements for
// every single page in your application. This disables the ability to
// perform automatic static optimization, causing every page in your app to
// be server-side rendered.
//
// MyApp.getInitialProps = async (appContext: AppContext) => {
//   // calls page's `getInitialProps` and fills `appProps.pageProps`
//   const appProps = await App.getInitialProps(appContext);

//   return { ...appProps }
// }

export default MyApp;
