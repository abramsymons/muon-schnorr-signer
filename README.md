Muon Schnorr Signer is a server that run a Muon app and return a schnorr signature on the response.

## Install

```
$ git clone https://github.com/abramsymons/muon-schnorr-signer.git
$ npm install
```

## Configure

```
cp .env.example .env
```
Edit the file and set `PRIVATE_KEY`

## Run

Copy your MuonApps to `muon-apps` directoy.

Run the server using:

```
npm start
```

> **_Security Note:_** Although having appId as a parameter in the signature prevents using signatures generated for a different app in other apps, but it's still recommened to not use same server with same key for running multiple apps.
