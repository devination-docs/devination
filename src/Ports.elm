port module Ports exposing (..)

import Types exposing (..)


port search : ( String, String ) -> Cmd msg


port download : (String, String, String, String) -> Cmd msg


port removeDocset : String -> Cmd msg


port searchResult : (List SearchIndex -> msg) -> Sub msg


port downloadResult : (InstalledLanguage -> msg) -> Sub msg


port removeDocsetResult : (String -> msg) -> Sub msg


port getSettings : String -> Cmd msg

port resetToDefaults : String -> Cmd msg

port setSettings : (Maybe Settings) -> Cmd msg

port settingsResult : (Settings -> msg) -> Sub msg

port extractionStart : (String -> msg) -> Sub msg

port showError : String -> Cmd msg

port externalSearch: (String -> msg) -> Sub msg