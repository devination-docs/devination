module Requests exposing (..)

import Http
import Json.Decode as Json exposing (field, Decoder, string, list, map5, maybe, keyValuePairs, andThen)
import Types exposing (..)
import Task exposing (..)


type alias UserDocsets =
    { docsets : List UserAvailableLanguage
    }


decodeMaybeString : Maybe String -> Decoder String
decodeMaybeString icon =
    Json.succeed (Maybe.withDefault "" icon)


userAvailableLanguageDecoder : Decoder OfficialAvailableLanguage
userAvailableLanguageDecoder =
    Json.map7 OfficialAvailableLanguage
        (field "name" string)
        (Json.succeed "")
        (Json.andThen decodeMaybeString (maybe (field "icon" string)))
        (Json.andThen decodeMaybeString (maybe (field "icon@2x" string)))
        (Json.andThen decodeMaybeString (maybe (field "version" string)))
        (maybe (field "specific_versions" (list string)))
        (Json.andThen decodeMaybeString (maybe (field "archive" string)))


userAvailableLanguagesDecoder : Decoder UserDocsets
userAvailableLanguagesDecoder =
    Json.map UserDocsets
        (field "docsets" (keyValuePairs userAvailableLanguageDecoder))


availableLanguageDecoder : Decoder OfficialAvailableLanguage
availableLanguageDecoder =
    Json.map7 OfficialAvailableLanguage
        (field "name" string)
        (field "title" string)
        (field "icon" string)
        (field "icon2x" string)
        (Json.succeed "")
        (maybe (field "versions" (list string)))
        (Json.succeed "")


availableLanguagesDecoder : Decoder (List OfficialAvailableLanguage)
availableLanguagesDecoder =
    list availableLanguageDecoder


getOfficialLanguages : Feed -> Cmd Msg
getOfficialLanguages feed =
    Http.toTask (Http.get feed availableLanguagesDecoder)
        |> Task.andThen (\fullText -> Task.succeed (UpdateAvailableLanguages <| List.map OfficialLanguage fullText))
        |> Task.onError (\error -> Task.succeed (FailRequest error))
        |> Task.perform identity


getUserContributedLanguages : Feed -> Cmd Msg
getUserContributedLanguages feed =
    Http.toTask (Http.get feed userAvailableLanguagesDecoder)
        |> Task.andThen (\fullText -> Task.succeed (UpdateAvailableLanguages <| List.map UserLanguage fullText.docsets))
        |> Task.onError (\error -> Task.succeed (FailRequest error))
        |> Task.perform identity
