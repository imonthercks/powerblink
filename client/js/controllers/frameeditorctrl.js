function FrameEditorController($scope, socket) {
    $scope.blinkState = 'new';
    $scope.frames = [
        {purple: "off", pink: "off", white: "off", yellow: "off", red: "off", blue: "off", time: 1}];
    
    $scope.addFrame = function(frame){
        $scope.blinkState = 'dirty';
        var index = $scope.frames.indexOf(frame) + 1;
        $scope.frames.splice(index, 0, {purple: "off", pink: "off", white: "off", yellow: "off", red: "off", blue: "off", time: 1});
    }
    
    $scope.removeFrame = function(frame){
        $scope.blinkState = 'dirty';
        if ($scope.frames.length > 1){
            var index = $scope.frames.indexOf(frame);
            $scope.frames.splice(index, 1);
        }
    }
    
    $scope.create = function(){
        if ($scope.blinkState=='dirty' && !window.confirm("You have unsaved changes, do you want to lose these changes?"))
            return;
        
        $scope.blinkState = 'new';
        $scope.frames = [{purple: "off", pink: "off", white: "off", yellow: "off", red: "off", blue: "off", time: 1}];
    }
    
    $scope.save = function(){
    }
    
    $scope.persist = function(){
        socket.emit('saveFrames', {name: $scope.blinkName, frames: $scope.frames});
        $scope.blinkState = 'pristine';
    }
    
    $scope.cancelNameForm = function(){
        $scope.blinkState = 'dirty';
    }
    
    $scope.send = function(){
        socket.emit('sendFrames', $scope.frames);
    }
    
    $scope.toggle = function(frame, color){
        $scope.blinkState = 'dirty';
        frame[color] = frame[color] == 'on' ? 'off' : 'on';
    }
    
    socket.on('blinkNames', function (blinkNames) {
          //_.each(blinkNames, function(item){console.log(item);});
          $scope.blinkNames = blinkNames;
        });
} 