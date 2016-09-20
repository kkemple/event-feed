const path = require('path')

const autoprefixer = require('autoprefixer')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const ExtractTextWebpackPlugin = require('extract-text-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ServiceWorkerWebpackPlugin = require('serviceworker-webpack-plugin')
const precss = require('precss')
const webpack = require('webpack')

const production = process.env.NODE_ENV === 'production'

// /////////////////////////////////////////////////////////////////////////////
// Plugin Configuration
// http://webpack.github.io/docs/list-of-plugins.html
// /////////////////////////////////////////////////////////////////////////////

// plugins for development builds only
const devPlugins = [
  // interpolate index.ejs to index.html, add assets to html file
  new HtmlWebpackPlugin({
    title: 'Event Feed',
    template: 'src/client/index.ejs',
    inject: 'body',
    filename: 'index.html'
  }),

  // prevent webpack from killing watch on build error
  new webpack.NoErrorsPlugin()
]

// base plugins
const plugins = [
  // remove build/client dir before compile time
  new CleanWebpackPlugin('build/client'),

  // copy static PWA assets
  new CopyWebpackPlugin([
    // copy manifest.json for app install
    { from: 'src/client/manifest.json' },

    // copy icon images for save to home screen and splash screen
    { from: 'src/client/assets/app-install-icons', to: 'public/img' }
  ]),

  // extract path is relative to publicPath `build/client`
  new ExtractTextWebpackPlugin('public/css/app.[hash].css'),

  // build vendor bundle (including common code chunks used in other bundles)
  new webpack.optimize.CommonsChunkPlugin('vendor', 'public/js/vendor.[hash].js'),

  // optimize chunk occurences
  new webpack.optimize.OccurenceOrderPlugin(true),

  // define env vars for application (shim for process.env)
  new webpack.DefinePlugin({
    'process.env': {
      BABEL_ENV: JSON.stringify(process.env.NODE_ENV),
      NODE_ENV: JSON.stringify(process.env.NODE_ENV)
    }
  }),

  // make service worker available to application
  new ServiceWorkerWebpackPlugin({
    entry: path.join(__dirname, 'src/client/sw.js'),
    filename: 'sw.js',
    excludes: [
      '**/.*',
      '**/*.map',
      '*.html'
    ]
  })
]

// plugins for production builds only
const prodPlugins = [
  // remove duplicate chunks
  new webpack.optimize.DedupePlugin(),

  // make sure we don't create too small chunks, merge together chunks smallert than 10kb
  new webpack.optimize.MinChunkSizePlugin({ minChunkSize: 10240 }), // ~10kb

  // minify the crap out of this thing
  new webpack.optimize.UglifyJsPlugin({
    mangle: true,
    compress: {
      // Suppress uglification warnings
      warnings: false
    }
  }),

  // interpolate index.ejs to index.html, add assets to html file
  new HtmlWebpackPlugin({
    title: 'Event Feed',
    template: 'src/client/index.ejs',
    inject: 'body',
    filename: 'index.html',
    minify: {
      removeComments: true,
      collapseWhitespace: true
    }
  })
]

module.exports = {
  debug: !production,

  // inline-source-map makes devtools point to source files
  devtool: production ? false : 'inline-source-map',

  entry: {
    // actual application code
    app: './src/client/index.js',

    // all third-party NPM modules should be added here
    vendor: [
      'debug',
      'keymirror',
      'lodash.debounce',
      'lodash.isequal',
      'lodash.throttle',
      'moment',
      'pouchdb',
      'react',
      'react-datepicker',
      'react-dom',
      'react-draggable',
      'react-router',
      'react-tappable',
      'socket.io-client'
    ]
  },

  module: {
    // handle linting before compile step
    preLoaders: [
      {
        exclude: /node_modules/,
        loader: 'standard',
        test: /\.js/
      }
    ],

    // set module loaders
    loaders: [
      // import es6 and convert to commonJS, also transpile React components and flow typing
      // see babel section of package.json for config
      {
        exclude: /node_modules/,
        loader: 'babel',
        test: /\.js$/
      },

      // convert css and prefix, pass to styles loader to inject in page
      {
        // extract styles to file
        loader: ExtractTextWebpackPlugin.extract('style', 'css!postcss'),
        test: /\.css$/
      },

      // import images as compressed data URIs
      {
        loader: 'url!image-webpack',
        test: /\.(png|jpg|svg)$/
      },

      // support json
      {
        exclude: /node_modules/,
        loader: 'json',
        test: /\.json$/
      }
    ]
  },

  // where to output, also naming conventions
  output: {
    chunkFilename: 'public/js/[name].[hash].js',
    filename: 'public/js/[name].[hash].js',
    path: 'build/client'
  },

  // load plugins
  plugins: production ? plugins.concat(prodPlugins) : plugins.concat(devPlugins),

  // postcss loader plugins
  postcss () {
    return [autoprefixer, precss]
  }
}
