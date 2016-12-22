module Main exposing (..)

import Html
import Html exposing (Html, button, div, text, p, iframe)
import Platform.Cmd exposing (batch)
import Task exposing (..)
import Platform.Sub as Sub
import Types exposing (..)
import Ports exposing (..)
import SettingsView exposing (settingsView)
import MainView exposing (mainView)
import Requests exposing (..)
import Error exposing (errorToString)
import String exposing (startsWith, toLower)


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ searchResult UpdateResult
        , downloadResult DownloadResult
        , removeDocsetResult RemoveDocsetResult
        , settingsResult SettingsResult
        ]


main : Program Never Model Msg
main =
    Html.program
        { view = view
        , update = update
        , init = ( defaultModel, Task.perform (always Init) (Task.succeed Init) )
        , subscriptions = subscriptions
        }


defaultModel : Model
defaultModel =
    { cache = []
    , docPage = ""
    , selectedDocPage = Nothing
    , language = Nothing
    , availableLanguages = []
    , filteredAvailableLanguages = []
    , isSettingsView = False
    , showSpinner = False
    , error = ""
    , downloading = False
    , settings = Nothing
    }


mergeLanguages : List InternalLanguage -> List InternalLanguage -> List InternalLanguage
mergeLanguages existing b =
    let
        type_ =
            List.head existing
                |> Maybe.map .source
                |> Maybe.withDefault Official

        filtered =
            List.filter (\e -> not <| e.source == type_) existing
    in
        b ++ existing


toDownloadUrl : Model -> InternalLanguage -> String
toDownloadUrl m l =
    let
        official = Maybe.withDefault "" <| Maybe.map .officialDownloadFeed m.settings      
        user = Maybe.withDefault "" <| Maybe.map .userFeed m.settings      
    in
        case l.source of
            Official ->
                official ++ "/" ++ l.name ++ ".tgz"

            UserContributation ->
                user ++ l.name ++ "/" ++ l.archive

            Custom a ->
                ""


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )

        UpdateResult c ->
            ( { model | cache = c }, Cmd.none )

        SetDocPage c id ->
            ( { model | docPage = c, selectedDocPage = Just id }, Cmd.none )

        UpdateSelectedLanguage l ->
            ( { model | language = Just l, cache = [] }, Cmd.none )

        Search t ->
            case model.language of
                Just l ->
                    ( model, search ( l.fsName, t ) )

                Nothing ->
                    ( model, Cmd.none )

        SearchAvailableLanguage t ->
            ( { model | filteredAvailableLanguages = List.filter (\x -> startsWith (toLower t) (toLower x.name)) model.availableLanguages }, Cmd.none )

        Download l ->
            ( { model | downloading = True }, download (l.name, toDownloadUrl model l, l.icon, l.icon2x) )

        RemoveDocset l ->
            ( model, removeDocset l.fsName )

        RemoveDocsetResult l ->
            let 
                s = model.settings
                ns = Maybe.map (\settings -> { settings | installedLanguages = List.filter (\x -> x.fsName /= l) settings.installedLanguages }) s
                nm = { model | settings = ns }
            in 
                (nm, setSettings nm.settings )

        DownloadResult m ->
            let 
                s = model.settings
                ns = Maybe.map (\settings -> { settings | installedLanguages = m::settings.installedLanguages }) s
                nm = { model | settings = ns }
            in 
                ({ nm | downloading = False}, setSettings nm.settings )

        UpdateAvailableLanguages lss ->
            let
                ls =
                    mergeLanguages (model.availableLanguages) <| asInternals lss
            in
                ( { model | availableLanguages = ls, filteredAvailableLanguages = ls }, spinnerEffect False )

        OpenSettings ->
            ( { model | isSettingsView = True }, Cmd.none )

        CloseSettings ->
            ( { model | isSettingsView = False }, Cmd.none )

        Spinner b ->
            ( { model | showSpinner = b }, Cmd.none )

        Init ->
            ( model, batch [ getSettings "" ] )

        FailRequest err ->
            ( { model | error = errorToString err }, batch [ showError (errorToString err) ] )

        SettingsResult settings ->
            -- ( { model | feeds = [] }, Cmd.none )
            ( { model | settings = Just settings }, batch [ getOfficialLanguages settings.officialFeed, getUserContributedLanguages (settings.userFeed ++ "index.json") ] )
    
        ResetSettings ->
            ( { model | settings = Nothing, language = Nothing } , batch [ resetToDefaults "", showError "Please restart the app" ] )

        GetSettings s ->
            ( model, Cmd.none )


spinnerEffect : Bool -> Cmd Msg
spinnerEffect showSpinner =
    Spinner showSpinner
        |> Task.succeed
        |> Task.perform (always (Spinner showSpinner))


view : Model -> Html Msg
view model =
    if model.isSettingsView then
        settingsView model
    else
        mainView model
