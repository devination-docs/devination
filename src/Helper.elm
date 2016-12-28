module Helper exposing (..)

getBasePath : { b | settings : Maybe { a | dataPath : String } } -> String
getBasePath m = 
    Maybe.withDefault "" <| Maybe.map .dataPath m.settings
