<?php
        require('connect.php');
        
        
                extract($_FILES);
                extract($_POST);
                $arquivo = "temp/".md5(time().$foto['size']). ".jpg";
                move_uploaded_file($foto['tmp_name'],$arquivo);
        

if(mysqli_query($con,"INSERT INTO `tb_cliente` (`codigo`, `nome`, `email`,`senha`,`telefone`,`data`,`cpf`,`foto`)
 VALUES (NULL, '$nome', '$email', '$senha', '$telefone','$data','$cpf','$arquivo');")){
    $msg = "Contato gravado com sucesso!";
}else{
        $msg = "Erro ao gravar";
}
    

session_start();
$_SESSION['msg'] = $msg;


header("location:listar.php");
?>