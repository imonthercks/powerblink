function FrameEditorController($scope, socket) {
    
    $scope.frames = [
        {purple: "off", pink: "off", white: "off", yellow: "off", red: "off", blue: "off", time: 1}];
    
    $scope.addFrame = function(frame){
        var index = $scope.frames.indexOf(frame) + 1;
        $scope.frames.splice(index, 0, {purple: "off", pink: "off", white: "off", yellow: "off", red: "off", blue: "off", time: 1});
    }
    
    $scope.removeFrame = function(frame){
        if ($scope.frames.length > 1){
            var index = $scope.frames.indexOf(frame);
            $scope.frames.splice(index, 1);
        }
    }
    
    $scope.create = function(){
        $scope.frames = [{purple: "off", pink: "off", white: "off", yellow: "off", red: "off", blue: "off", time: 1}];
    }
    
    $scope.save = function(){
        $scope.nameFormVisible = true; 
    }
    
    $scope.persist = function(){
        socket.emit('saveFrames', {name: $scope.blinkName, frames: $scope.frames});
        $scope.nameFormVisible = false;
    }
    
    $scope.cancelNameForm = function(){
        $scope.nameFormVisible = false;
    }
    
    $scope.send = function(){
        socket.emit('sendFrames', $scope.frames);
    }
    
    $scope.toggle = function(frame, color){
        frame[color] = frame[color] == 'on' ? 'off' : 'on';
    }
} 