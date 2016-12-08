module Error exposing (errorToString)

import Http


errorToString : Http.Error -> String
errorToString err =
    case err of
        Http.Timeout ->
            "Timeout"

        Http.NetworkError ->
            "The requests to the server fail. Check your internet connection"

        Http.BadPayload a _ ->
            "BadPayload: " ++ a

        Http.BadStatus a ->
            "Bad status"

        Http.BadUrl l ->
            "BadUrl: " ++ l
