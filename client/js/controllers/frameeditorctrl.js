function FrameEditorController($scope, socket) {
    
    $scope.frames = [
        {red: "off", blue: "off", green: "off", yellow: "off", white: "off", pink: "off", time: 1.0},
        {red: "off", blue: "on", green: "off", yellow: "off", white: "off", pink: "off", time: 1.0}
    ];
    
    $scope.addFrame = function(frame){
        var index = $scope.frames.indexOf(frame) + 1;
        $scope.frames.splice(index, 0, {red: "off", blue: "off", green: "off", yellow: "off", white: "off", pink: "off", time: 1.0});
    }
    
    $scope.removeFrame = function(frame){
        if ($scope.frames.length > 1){
            var index = $scope.frames.indexOf(frame);
            $scope.frames.splice(index, 1);
        }
    }
    
    $scope.create = function(){
        $scope.frames = [
            {red: "off", blue: "off", green: "off", yellow: "off", white: "off", pink: "off", time: 1.0},
            {red: "off", blue: "on", green: "off", yellow: "off", white: "off", pink: "off", time: 1.0}
        ];
    }
    
    $scope.save = function(){
        socket.emit('saveFrames', $scope.frames);
    }
    
    $scope.send = function(){
        socket.emit('sendFrames', $scope.frames);
    }
} 